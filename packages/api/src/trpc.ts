import type { NextRequest } from "next/server";
import { initTRPC } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";

import { transformer } from "./transformer";

interface CreateContextOptions {
  req?: NextRequest;
  auth?: any;
}

export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    ...opts,
  };
};

// see: https://clerk.com/docs/references/nextjs/trpc
export const createTRPCContext = async (opts: { req: NextRequest }) => {
  return createInnerTRPCContext({
    req: opts.req,
    auth: await auth(),
  });
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const procedure = t.procedure;
export const mergeRouters = t.mergeRouters;

export const protectedProcedure = procedure.use(async (opts) => {
  const { req, auth } = opts.ctx;
  const { userId } = auth;
  return opts.next({ ctx: { req, userId: userId } });
});
