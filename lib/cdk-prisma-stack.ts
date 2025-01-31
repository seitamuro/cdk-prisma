import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import "dotenv/config";
import { Db } from "./construct/db";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkPrismaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
    });

    const dbInstance = new Db(this, "DbInstance", {
      vpc: vpc,
    });

    const prismaFunction = new NodejsFunction(this, "PrismaFunction", {
      runtime: Runtime.NODEJS_20_X,
      environment: {
        //PRISMA_QUERY_ENGINE_LIBRARY: "./libquery_engine-rhel-openssl-3.0.x.so",
        DATABASE_URL: dbInstance.dbUrl,
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
          afterBundling: (i, o) => [`pnpm prisma generate`],
        },
      },
    });

    new cdk.CfnOutput(this, "SecretName", {
      value: dbInstance.dbSecret.secretName,
    });
    new cdk.CfnOutput(this, "DbPublicIp", {
      value: dbInstance.publicIp,
    });
  }
}
