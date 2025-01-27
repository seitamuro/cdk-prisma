import * as cdk from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import "dotenv/config";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkPrismaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const prismaFunction = new NodejsFunction(this, "PrismaFunction", {
      runtime: Runtime.NODEJS_20_X,
      environment: {
        //PRISMA_QUERY_ENGINE_LIBRARY: "./libquery_engine-rhel-openssl-3.0.x.so",
        DATABASE_URL: process.env.DATABASE_URL!,
      },
      entry: "./lambda/index.ts",
      //depsLockFilePath: "./package-lock.json",
      bundling: {
        nodeModules: ["@prisma/client", "prisma"],
        commandHooks: {
          beforeInstall: (i, o) => [
            `cp -r ${i}/prisma ${o}`,
            //`cp -r ${i}/node_modules/prisma/libquery_engine-rhel-openssl-3.0.x.so.node ${o}`,
          ],
          beforeBundling: (i, o) => [],
          afterBundling: (i, o) => [`npx prisma generate`],
        },
      },
    });
  }
}
