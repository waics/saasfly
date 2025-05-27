import "server-only";

import {cookies, headers} from "next/headers";
import {createTRPCProxyClient, loggerLink, TRPCClientError} from "@trpc/client";
import {experimental_createTRPCNextAppDirServer} from "@trpc/next/app-dir/server";

import {AppRouter} from "@saasfly/api";

import {endingLink, transformer} from "./shared";
import {observable} from "@trpc/server/observable";
import { callProcedure } from "@trpc/server";
import {TRPCErrorResponse} from "@trpc/server/rpc";
import { cache } from "react";
import {NextRequest} from "next/server";
import { appRouter } from "../../../../packages/api/src/root";
import { getAuth } from "@clerk/nextjs/server";

type AuthObject = ReturnType<typeof getAuth>;

export const createTRPCContext = async (opts: {
    headers: Headers;
    auth: AuthObject;
}) => {
    return {
        userId: opts.auth.userId,
        ...opts,
    };
};


/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(() => {
    return createTRPCContext({
        headers: new Headers({
            cookie: cookies().toString(),
            "x-trpc-source": "rsc",
        }),
        auth: getAuth(
            new NextRequest("https://next-template-git-feature-clerk-saasfly.vercel.app/", {headers: headers()}),
        ),
    });
});

export const trpc = createTRPCProxyClient<AppRouter>({
    transformer,
    links: [
        loggerLink({
            enabled: (op) =>
                process.env.NODE_ENV === "development" ||
                (op.direction === "down" && op.result instanceof Error),
        }),
        /**
         * Custom RSC link that lets us invoke procedures without using http requests. Since Server
         * Components always run on the server, we can just call the procedure as a function.
         */
        () =>
            ({op}) =>
                observable((observer) => {
                    createContext()
                        .then((ctx) => {
                            return callProcedure({
                                procedures: appRouter._def.procedures,
                                path: op.path,
                                rawInput: op.input,
                                ctx,
                                type: op.type,
                            });
                        })
                        .then((data) => {
                            observer.next({result: {data}});
                            observer.complete();
                        })
                        .catch((cause: TRPCErrorResponse) => {
                            observer.error(TRPCClientError.from(cause));
                        });
                }),
    ],
});
export {type RouterInputs, type RouterOutputs} from "@saasfly/api";
