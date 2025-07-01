import { type Application, type NextFunction, type Request, type RequestHandler, type Response, Router } from 'express';

export abstract class Middleware {
	abstract handler(req: Request, res: Response, next: NextFunction): void | Promise<void>;
}
export abstract class ErrorMiddleware {
	abstract handler(err: unknown, req: Request, res: Response, next: NextFunction): void | Promise<void>;
}
type MiddlewareOrHandler = Middleware | RequestHandler;

interface ControllerMetadata {
	path: string;
	middlewares: MiddlewareOrHandler[];
}
function isControllerMetadata(o: unknown): o is ControllerMetadata {
	if (typeof o !== 'object' || o == null) return false;

	const record = o as Record<string, unknown>;

	return (
		typeof record.path === 'string' &&
		Array.isArray(record.middlewares) &&
		record.middlewares.every((middleware) => typeof middleware === 'function' || middleware instanceof Middleware)
	);
}
export function Controller(path: string = '', middlewares: MiddlewareOrHandler[] = []): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(
			'malmajs:controller',
			{
				path,
				middlewares,
			} satisfies ControllerMetadata,
			target.prototype,
		);
	};
}

type HandlerMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';
interface HandlerMetadata {
	method: HandlerMethod;
	path: string;
	middlewares: MiddlewareOrHandler[];
}
function isHandlerMetadata(o: unknown): o is HandlerMetadata {
	if (typeof o !== 'object' || o == null) return false;

	const record = o as Record<string, unknown>;

	return (
		typeof record.method === 'string' &&
		typeof record.path === 'string' &&
		Array.isArray(record.middlewares) &&
		record.middlewares.every((middleware) => typeof middleware === 'function' || middleware instanceof Middleware)
	);
}
function createHandlerDecorator(method: HandlerMethod) {
	return function (path: string = '', middlewares: MiddlewareOrHandler[] = []): MethodDecorator {
		return (target, propertyKey, descriptor) => {
			Reflect.defineMetadata(
				'malmajs:handler',
				{
					method,
					path,
					middlewares,
				} satisfies HandlerMetadata,
				target,
				propertyKey,
			);
			return descriptor;
		};
	};
}
export const Get = createHandlerDecorator('get');
export const Post = createHandlerDecorator('post');
export const Put = createHandlerDecorator('put');
export const Delete = createHandlerDecorator('delete');
export const Patch = createHandlerDecorator('patch');

declare module 'express-serve-static-core' {
	interface Application {
		useControllers(...controllers: object[]): void;
		useMiddlewares(...middlewares: Middleware[]): void;
		useErrorMiddleware(errorMiddleware: ErrorMiddleware): void;
	}
}
function transformMiddlewares(middlewares: MiddlewareOrHandler[]): RequestHandler[] {
	return middlewares.map<RequestHandler>((middleware) => {
		if (typeof middleware === 'function') {
			return middleware;
		}
		return middleware.handler.bind(middleware);
	});
}
export function applyExpressDecorator(app: Application) {
	app.useControllers = (...controllers) => {
		for (const index in controllers) {
			const controller = controllers[index];

			const controllerMetadata = Reflect.getMetadata('malmajs:controller', controller);
			if (!isControllerMetadata(controllerMetadata)) {
				throw new Error(`Controller at index '${index}' has invalid metadata.`);
			}

			const router = Router();

			const controllerPrototype = Object.getPrototypeOf(controller);
			const controllerPropertyNames = Object.getOwnPropertyNames(controllerPrototype);

			for (const controllerPropertyName of controllerPropertyNames) {
				if (controllerPropertyName === 'constructor') {
					continue;
				}

				const descriptor = Object.getOwnPropertyDescriptor(controllerPrototype, controllerPropertyName);
				if (!descriptor || typeof descriptor.value !== 'function') {
					continue;
				}

				const handlerMetadata = Reflect.getMetadata('malmajs:handler', controller, controllerPropertyName);
				if (!isHandlerMetadata(handlerMetadata)) {
					throw new Error(`Method '${controllerPropertyName}' in controller at index '${index}' has invalid metadata.`);
				}

				router[handlerMetadata.method](
					handlerMetadata.path,
					...transformMiddlewares(handlerMetadata.middlewares),
					descriptor.value.bind(controller),
				);
			}

			app.use(controllerMetadata.path, ...transformMiddlewares(controllerMetadata.middlewares), router);
		}
	};

	app.useMiddlewares = (...middlewares) => {
		app.use(transformMiddlewares(middlewares));
	};

	app.useErrorMiddleware = (errorMiddleware) => {
		app.use(errorMiddleware.handler.bind(errorMiddleware));
	};

	return app;
}
