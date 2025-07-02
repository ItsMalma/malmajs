# Express Decorator

Express Decorator is a package that simplifies Express.js routing using decorators for class-based controllers. Provides a structured way to define routes, middlewares, and error handlers.

## Install

### NPM
```bash
npm install express reflect-metadata @malmajs/express-decorator
npm install -D typescript @types/express
```
### Yarn
```bash
yarn add express reflect-metadata @malmajs/express-decorator
yarn add -D typescript @types/express
```
### PNPM
```bash
pnpm add express reflect-metadata @malmajs/express-decorator
pnpm add -D typescript @types/express
```
### Bun
```bash
bun add express reflect-metadata @malmajs/express-decorator
bun add -d typescript @types/express
```

## Decorator

Enable decorators in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Tutorial

### Integrate with Express

```ts
import 'reflect-metadata'; // IMPORTANT, MUST BE FIRST

import express from 'express';
import { applyExpressDecorator } from '@malmajs/express-decorator';

const app = express();
applyExpressDecorator(app);
```

### Controller

```ts
import { Controller, Get, Post } from '@malmajs/express-decorator';
import type { Request, Response } from 'express';

@Controller('/example')
class ExampleController {
  @Get('')
  index(req: Request, res: Response) {
    res.send('<h1>Example!</h1>');
  }

  @Post('/create')
  createUser(req: Request, res: Response) {
    res.status(201).send('<h1>Created!</h1>');
  }
}
```

### Use Controller

```ts
app.useControllers(new UserController());
```

### Request Middleware

```ts
import { Middleware } from '@malmajs/express-decorator';
import type { Request, Response, NextFunction } from 'express';

class LoggerMiddleware extends Middleware {
  handler(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.path}`);
    next();
  }
}
```

### Use Request Middleware

```ts
// via controller
@Controller('/example', [new LoggerMiddleware()])
class ExampleController {}

// via handler
@Controller('/example')
class ExampleController {
  @Get('', [new LoggerMiddleware()])
  index(req: Request, res: Response) {
    res.send('<h1>Example!</h1>');
  }
}

// via app
app.useMiddlewares(new LoggerMiddleware());
```

### Error Middleware

```ts
import { ErrorMiddleware } from '@malmajs/express-decorator';
import type { Request, Response, NextFunction } from 'express';

class MyErrorMiddleware extends ErrorMiddleware {
  handler(err: unknown, req: Request, res: Response, next: NextFunction) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
}
```

### Use Error Middleware

```ts
app.useErrorMiddleware(new MyErrorMiddleware());
```

### Use Non-Class Request Middleware

```ts
@Controller('/api', [express.json()])
class ApiController {}
```
