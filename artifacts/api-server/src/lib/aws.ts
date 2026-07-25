import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import { EC2Client, DescribeNetworkInterfacesCommand } from "@aws-sdk/client-ec2";
import crypto from "crypto";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const CLUSTER = process.env.ECS_CLUSTER ?? "missing-semester-cluster";
const TASK_DEFINITION = process.env.ECS_TASK_DEFINITION ?? "missing-semester-jupyter";
const SECURITY_GROUP = process.env.ECS_SECURITY_GROUP ?? "";
const SUBNETS = (process.env.ECS_SUBNETS ?? "").split(",").filter(Boolean);
const S3_BUCKET = process.env.S3_BUCKET ?? "missing-semester-data-748999352678";

function awsCredentials() {
  if (process.env.AWS_ACCESS_ID) {
    return {
      accessKeyId: process.env.AWS_ACCESS_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY ?? "",
    };
  }
  return undefined; // fall back to instance role in production
}

const ecsClient = new ECSClient({ region: REGION, credentials: awsCredentials() });
const ec2Client = new EC2Client({ region: REGION, credentials: awsCredentials() });

export interface LaunchSessionOptions {
  sessionId: number;
  lessonId: number;
  platformApiUrl: string;
  apiKeys?: Record<string, string>; // service -> plaintext key
}

export async function launchJupyterTask(
  opts: LaunchSessionOptions,
): Promise<{ ecsTaskArn: string; jupyterToken: string }> {
  const jupyterToken = crypto.randomBytes(32).toString("hex");

  const environment = [
    { name: "LESSON_ID", value: String(opts.lessonId) },
    { name: "SESSION_ID", value: String(opts.sessionId) },
    { name: "S3_BUCKET", value: S3_BUCKET },
    { name: "PLATFORM_API_URL", value: opts.platformApiUrl },
    { name: "JUPYTER_TOKEN", value: jupyterToken },
    ...Object.entries(opts.apiKeys ?? {}).map(([service, key]) => ({
      name: `${service.toUpperCase()}_API_KEY`,
      value: key,
    })),
  ];

  const result = await ecsClient.send(
    new RunTaskCommand({
      cluster: CLUSTER,
      taskDefinition: TASK_DEFINITION,
      launchType: "FARGATE",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: SUBNETS,
          securityGroups: [SECURITY_GROUP],
          assignPublicIp: "ENABLED",
        },
      },
      overrides: {
        containerOverrides: [{ name: "jupyter", environment }],
      },
      tags: [
        { key: "session-id", value: String(opts.sessionId) },
        { key: "lesson-id", value: String(opts.lessonId) },
      ],
    }),
  );

  const task = result.tasks?.[0];
  if (!task?.taskArn) {
    const failure = result.failures?.[0];
    throw new Error(`ECS task launch failed: ${failure?.reason ?? "unknown"}`);
  }

  return { ecsTaskArn: task.taskArn, jupyterToken };
}

/** Poll ECS until task is RUNNING, then resolve its public IP. Returns null if not yet running. */
export async function resolveTaskPublicIp(ecsTaskArn: string): Promise<string | null> {
  const result = await ecsClient.send(
    new DescribeTasksCommand({ cluster: CLUSTER, tasks: [ecsTaskArn] }),
  );
  const task = result.tasks?.[0];
  if (!task || task.lastStatus !== "RUNNING") return null;

  const eniId = task.attachments
    ?.find((a) => a.type === "ElasticNetworkInterface")
    ?.details?.find((d) => d.name === "networkInterfaceId")?.value;

  if (!eniId) return null;

  const eniResult = await ec2Client.send(
    new DescribeNetworkInterfacesCommand({ NetworkInterfaceIds: [eniId] }),
  );
  return eniResult.NetworkInterfaces?.[0]?.Association?.PublicIp ?? null;
}

export async function stopTask(ecsTaskArn: string): Promise<void> {
  await ecsClient.send(
    new StopTaskCommand({
      cluster: CLUSTER,
      task: ecsTaskArn,
      reason: "Stopped by platform user request",
    }),
  );
}
