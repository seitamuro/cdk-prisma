import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

interface PrismaFunctionProps extends NodejsFunctionProps {
  dbUrl: string;
}

export class PrismaFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: PrismaFunctionProps) {
    super(scope, id, {
      ...props,
      environment: {
        DATABASE_URL: props.dbUrl,
      },
      bundling: {
        nodeModules: ["@prisma/client", "prisma"],
        commandHooks: {
          beforeInstall: (i, o) => [`cp -r ${i}/prisma ${o}`],
          beforeBundling: (i, o) => [],
          afterBundling: (i, o) => [`pnpm prisma generate`],
        },
      },
    });
  }
}
