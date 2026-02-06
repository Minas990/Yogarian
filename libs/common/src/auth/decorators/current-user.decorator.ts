import { ExecutionContext,createParamDecorator } from "@nestjs/common";

export const CurrentUser = createParamDecorator((data,ctx:ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
});
