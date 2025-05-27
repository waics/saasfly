import type { NextRequest } from "next/server";
import {initTRPC, TRPCError} from "@trpc/server";
import {auth, currentUser} from "@clerk/nextjs/server";
import { ZodError } from "zod";

import { transformer } from "./transformer";

interface CreateContextOptions {
  req?: NextRequest;
  auth?: any;
}

// see: https://clerk.com/docs/references/nextjs/trpc
export const createTRPCContext = async () => {
  return {
    auth: await auth(),
    user: await currentUser(),
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

export const t = initTRPC.context<TRPCContext>().create({
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

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});


export const protectedProcedure = procedure.use(isAuthed);