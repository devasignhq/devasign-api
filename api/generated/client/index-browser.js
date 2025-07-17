
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  userId: 'userId',
  username: 'username',
  walletAddress: 'walletAddress',
  walletSecret: 'walletSecret',
  addressBook: 'addressBook',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContributionSummaryScalarFieldEnum = {
  id: 'id',
  tasksCompleted: 'tasksCompleted',
  activeTasks: 'activeTasks',
  totalEarnings: 'totalEarnings',
  userId: 'userId'
};

exports.Prisma.SubscriptionPackageScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  maxTasks: 'maxTasks',
  maxUsers: 'maxUsers',
  paid: 'paid',
  price: 'price',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InstallationScalarFieldEnum = {
  id: 'id',
  htmlUrl: 'htmlUrl',
  targetId: 'targetId',
  targetType: 'targetType',
  account: 'account',
  walletAddress: 'walletAddress',
  walletSecret: 'walletSecret',
  escrowAddress: 'escrowAddress',
  escrowSecret: 'escrowSecret',
  subscriptionPackageId: 'subscriptionPackageId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  issue: 'issue',
  timeline: 'timeline',
  timelineType: 'timelineType',
  bounty: 'bounty',
  status: 'status',
  settled: 'settled',
  acceptedAt: 'acceptedAt',
  completedAt: 'completedAt',
  creatorId: 'creatorId',
  contributorId: 'contributorId',
  installationId: 'installationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskSubmissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  taskId: 'taskId',
  installationId: 'installationId',
  pullRequest: 'pullRequest',
  attachmentUrl: 'attachmentUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskActivityScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  userId: 'userId',
  taskSubmissionId: 'taskSubmissionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  code: 'code',
  name: 'name',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserInstallationPermissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  installationId: 'installationId',
  permissionCodes: 'permissionCodes',
  assignedBy: 'assignedBy',
  assignedAt: 'assignedAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  txHash: 'txHash',
  category: 'category',
  amount: 'amount',
  doneAt: 'doneAt',
  taskId: 'taskId',
  sourceAddress: 'sourceAddress',
  destinationAddress: 'destinationAddress',
  asset: 'asset',
  assetFrom: 'assetFrom',
  assetTo: 'assetTo',
  fromAmount: 'fromAmount',
  toAmount: 'toAmount',
  installationId: 'installationId',
  userId: 'userId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.TimelineType = exports.$Enums.TimelineType = {
  WEEK: 'WEEK',
  DAY: 'DAY'
};

exports.TaskStatus = exports.$Enums.TaskStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  MARKED_AS_COMPLETED: 'MARKED_AS_COMPLETED',
  COMPLETED: 'COMPLETED'
};

exports.TransactionCategory = exports.$Enums.TransactionCategory = {
  BOUNTY: 'BOUNTY',
  SWAP_USDC: 'SWAP_USDC',
  SWAP_XLM: 'SWAP_XLM',
  WITHDRAWAL: 'WITHDRAWAL',
  TOP_UP: 'TOP_UP'
};

exports.Prisma.ModelName = {
  User: 'User',
  ContributionSummary: 'ContributionSummary',
  SubscriptionPackage: 'SubscriptionPackage',
  Installation: 'Installation',
  Task: 'Task',
  TaskSubmission: 'TaskSubmission',
  TaskActivity: 'TaskActivity',
  Permission: 'Permission',
  UserInstallationPermission: 'UserInstallationPermission',
  Transaction: 'Transaction'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
