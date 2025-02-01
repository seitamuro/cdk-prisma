import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface DbProps {
  vpc: ec2.Vpc;
}

export class Db extends Construct {
  public readonly publicIp: string;
  public readonly dbSecret: secretsmanager.Secret;
  public readonly dbUrl: string;

  constructor(scope: Construct, id: string, props: DbProps) {
    super(scope, id);

    const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "postgres",
        }),
        generateStringKey: "password",
        excludeCharacters: '"@/\\\'"#$[]{}()^¥;:%!?*<>~',
      },
    });

    const userData = ec2.UserData.forLinux({
      shebang: "#!/bin/bash -xe",
    });
    userData.addCommands(
      "sudo yum install -y postgresql15-server",
      "sudo postgresql-setup initdb",
      "sudo su - root",
      "cd /var/lib/pgsql/data",
      "sudo sed -i -e \"s/^#listen_addresses = 'localhost'/listen_addresses = '*'/g\" ./postgresql.conf",
      'sudo echo "host all all 0.0.0.0/0 md5" >> ./pg_hba.conf',
      "sudo service postgresql start",
      `DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${dbSecret.secretName} --query SecretString --output text | jq -r '.password')`,
      `DB_USERNAME=$(aws secretsmanager get-secret-value --secret-id ${dbSecret.secretName} --query SecretString --output text | jq -r '.username')`,
      "sleep 10",
      `sudo -u postgres psql -c "ALTER USER $DB_USERNAME WITH PASSWORD '$DB_PASSWORD';"`
    );

    const securityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "Allow inbound traffic to PostgreSQL"
    );

    const ec2SsmManagedRole = new iam.Role(this, "EC2SSMManagedRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonEC2RoleforSSM"
        ),
      ],
    });

    const dbInstance = new ec2.Instance(this, "DbInstance", {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      role: ec2SsmManagedRole,
      userData: userData,
      securityGroup: securityGroup,
      associatePublicIpAddress: true,
    });
    dbInstance.userData.addSignalOnExitCommand(dbInstance);
    dbSecret.grantRead(dbInstance);

    this.publicIp = dbInstance.instancePublicIp;
    this.dbSecret = dbSecret;
    this.dbUrl = `postgresql://${dbSecret
      .secretValueFromJson("username")
      .unsafeUnwrap()}:${dbSecret
      .secretValueFromJson("password")
      .unsafeUnwrap()}@${dbInstance.instancePublicIp}:5432/mydb?schema=public`;
  }
}
