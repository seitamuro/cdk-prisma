import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import "dotenv/config";
import { Db } from "./construct/db";
import { PrismaFunction } from "./construct/prismaFunction";
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

    const prismaFunction = new PrismaFunction(this, "PrismaFunction", {
      runtime: Runtime.NODEJS_22_X,
      handler: "handler",
      entry: "./lambda/index.ts",
      dbUrl: dbInstance.dbUrl,
      timeout: cdk.Duration.seconds(20),
    });

    new cdk.CfnOutput(this, "SecretName", {
      value: dbInstance.dbSecret.secretName,
    });
    new cdk.CfnOutput(this, "DbPublicIp", {
      value: dbInstance.publicIp,
    });
  }
}
