
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model ContributionSummary
 * 
 */
export type ContributionSummary = $Result.DefaultSelection<Prisma.$ContributionSummaryPayload>
/**
 * Model SubscriptionPackage
 * 
 */
export type SubscriptionPackage = $Result.DefaultSelection<Prisma.$SubscriptionPackagePayload>
/**
 * Model Installation
 * 
 */
export type Installation = $Result.DefaultSelection<Prisma.$InstallationPayload>
/**
 * Model Task
 * 
 */
export type Task = $Result.DefaultSelection<Prisma.$TaskPayload>
/**
 * Model TaskSubmission
 * 
 */
export type TaskSubmission = $Result.DefaultSelection<Prisma.$TaskSubmissionPayload>
/**
 * Model TaskActivity
 * 
 */
export type TaskActivity = $Result.DefaultSelection<Prisma.$TaskActivityPayload>
/**
 * Model Permission
 * 
 */
export type Permission = $Result.DefaultSelection<Prisma.$PermissionPayload>
/**
 * Model UserInstallationPermission
 * 
 */
export type UserInstallationPermission = $Result.DefaultSelection<Prisma.$UserInstallationPermissionPayload>
/**
 * Model Transaction
 * 
 */
export type Transaction = $Result.DefaultSelection<Prisma.$TransactionPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const TaskStatus: {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  MARKED_AS_COMPLETED: 'MARKED_AS_COMPLETED',
  COMPLETED: 'COMPLETED'
};

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]


export const TimelineType: {
  WEEK: 'WEEK',
  DAY: 'DAY'
};

export type TimelineType = (typeof TimelineType)[keyof typeof TimelineType]


export const TransactionCategory: {
  BOUNTY: 'BOUNTY',
  SWAP_USDC: 'SWAP_USDC',
  SWAP_XLM: 'SWAP_XLM',
  WITHDRAWAL: 'WITHDRAWAL',
  TOP_UP: 'TOP_UP'
};

export type TransactionCategory = (typeof TransactionCategory)[keyof typeof TransactionCategory]

}

export type TaskStatus = $Enums.TaskStatus

export const TaskStatus: typeof $Enums.TaskStatus

export type TimelineType = $Enums.TimelineType

export const TimelineType: typeof $Enums.TimelineType

export type TransactionCategory = $Enums.TransactionCategory

export const TransactionCategory: typeof $Enums.TransactionCategory

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.contributionSummary`: Exposes CRUD operations for the **ContributionSummary** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ContributionSummaries
    * const contributionSummaries = await prisma.contributionSummary.findMany()
    * ```
    */
  get contributionSummary(): Prisma.ContributionSummaryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.subscriptionPackage`: Exposes CRUD operations for the **SubscriptionPackage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SubscriptionPackages
    * const subscriptionPackages = await prisma.subscriptionPackage.findMany()
    * ```
    */
  get subscriptionPackage(): Prisma.SubscriptionPackageDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.installation`: Exposes CRUD operations for the **Installation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Installations
    * const installations = await prisma.installation.findMany()
    * ```
    */
  get installation(): Prisma.InstallationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.task`: Exposes CRUD operations for the **Task** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tasks
    * const tasks = await prisma.task.findMany()
    * ```
    */
  get task(): Prisma.TaskDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.taskSubmission`: Exposes CRUD operations for the **TaskSubmission** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TaskSubmissions
    * const taskSubmissions = await prisma.taskSubmission.findMany()
    * ```
    */
  get taskSubmission(): Prisma.TaskSubmissionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.taskActivity`: Exposes CRUD operations for the **TaskActivity** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TaskActivities
    * const taskActivities = await prisma.taskActivity.findMany()
    * ```
    */
  get taskActivity(): Prisma.TaskActivityDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.permission`: Exposes CRUD operations for the **Permission** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Permissions
    * const permissions = await prisma.permission.findMany()
    * ```
    */
  get permission(): Prisma.PermissionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userInstallationPermission`: Exposes CRUD operations for the **UserInstallationPermission** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserInstallationPermissions
    * const userInstallationPermissions = await prisma.userInstallationPermission.findMany()
    * ```
    */
  get userInstallationPermission(): Prisma.UserInstallationPermissionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.transaction`: Exposes CRUD operations for the **Transaction** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Transactions
    * const transactions = await prisma.transaction.findMany()
    * ```
    */
  get transaction(): Prisma.TransactionDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.6.0
   * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
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

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "contributionSummary" | "subscriptionPackage" | "installation" | "task" | "taskSubmission" | "taskActivity" | "permission" | "userInstallationPermission" | "transaction"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      ContributionSummary: {
        payload: Prisma.$ContributionSummaryPayload<ExtArgs>
        fields: Prisma.ContributionSummaryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ContributionSummaryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ContributionSummaryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>
          }
          findFirst: {
            args: Prisma.ContributionSummaryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ContributionSummaryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>
          }
          findMany: {
            args: Prisma.ContributionSummaryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>[]
          }
          create: {
            args: Prisma.ContributionSummaryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>
          }
          createMany: {
            args: Prisma.ContributionSummaryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ContributionSummaryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>[]
          }
          delete: {
            args: Prisma.ContributionSummaryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>
          }
          update: {
            args: Prisma.ContributionSummaryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>
          }
          deleteMany: {
            args: Prisma.ContributionSummaryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ContributionSummaryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ContributionSummaryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>[]
          }
          upsert: {
            args: Prisma.ContributionSummaryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContributionSummaryPayload>
          }
          aggregate: {
            args: Prisma.ContributionSummaryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateContributionSummary>
          }
          groupBy: {
            args: Prisma.ContributionSummaryGroupByArgs<ExtArgs>
            result: $Utils.Optional<ContributionSummaryGroupByOutputType>[]
          }
          count: {
            args: Prisma.ContributionSummaryCountArgs<ExtArgs>
            result: $Utils.Optional<ContributionSummaryCountAggregateOutputType> | number
          }
        }
      }
      SubscriptionPackage: {
        payload: Prisma.$SubscriptionPackagePayload<ExtArgs>
        fields: Prisma.SubscriptionPackageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubscriptionPackageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubscriptionPackageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>
          }
          findFirst: {
            args: Prisma.SubscriptionPackageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubscriptionPackageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>
          }
          findMany: {
            args: Prisma.SubscriptionPackageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>[]
          }
          create: {
            args: Prisma.SubscriptionPackageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>
          }
          createMany: {
            args: Prisma.SubscriptionPackageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubscriptionPackageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>[]
          }
          delete: {
            args: Prisma.SubscriptionPackageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>
          }
          update: {
            args: Prisma.SubscriptionPackageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>
          }
          deleteMany: {
            args: Prisma.SubscriptionPackageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubscriptionPackageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SubscriptionPackageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>[]
          }
          upsert: {
            args: Prisma.SubscriptionPackageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPackagePayload>
          }
          aggregate: {
            args: Prisma.SubscriptionPackageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubscriptionPackage>
          }
          groupBy: {
            args: Prisma.SubscriptionPackageGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionPackageGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubscriptionPackageCountArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionPackageCountAggregateOutputType> | number
          }
        }
      }
      Installation: {
        payload: Prisma.$InstallationPayload<ExtArgs>
        fields: Prisma.InstallationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InstallationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InstallationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>
          }
          findFirst: {
            args: Prisma.InstallationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InstallationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>
          }
          findMany: {
            args: Prisma.InstallationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>[]
          }
          create: {
            args: Prisma.InstallationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>
          }
          createMany: {
            args: Prisma.InstallationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InstallationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>[]
          }
          delete: {
            args: Prisma.InstallationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>
          }
          update: {
            args: Prisma.InstallationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>
          }
          deleteMany: {
            args: Prisma.InstallationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InstallationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InstallationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>[]
          }
          upsert: {
            args: Prisma.InstallationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallationPayload>
          }
          aggregate: {
            args: Prisma.InstallationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInstallation>
          }
          groupBy: {
            args: Prisma.InstallationGroupByArgs<ExtArgs>
            result: $Utils.Optional<InstallationGroupByOutputType>[]
          }
          count: {
            args: Prisma.InstallationCountArgs<ExtArgs>
            result: $Utils.Optional<InstallationCountAggregateOutputType> | number
          }
        }
      }
      Task: {
        payload: Prisma.$TaskPayload<ExtArgs>
        fields: Prisma.TaskFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findFirst: {
            args: Prisma.TaskFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findMany: {
            args: Prisma.TaskFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          create: {
            args: Prisma.TaskCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          createMany: {
            args: Prisma.TaskCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          delete: {
            args: Prisma.TaskDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          update: {
            args: Prisma.TaskUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          deleteMany: {
            args: Prisma.TaskDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          upsert: {
            args: Prisma.TaskUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          aggregate: {
            args: Prisma.TaskAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTask>
          }
          groupBy: {
            args: Prisma.TaskGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskCountArgs<ExtArgs>
            result: $Utils.Optional<TaskCountAggregateOutputType> | number
          }
        }
      }
      TaskSubmission: {
        payload: Prisma.$TaskSubmissionPayload<ExtArgs>
        fields: Prisma.TaskSubmissionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskSubmissionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskSubmissionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>
          }
          findFirst: {
            args: Prisma.TaskSubmissionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskSubmissionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>
          }
          findMany: {
            args: Prisma.TaskSubmissionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>[]
          }
          create: {
            args: Prisma.TaskSubmissionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>
          }
          createMany: {
            args: Prisma.TaskSubmissionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskSubmissionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>[]
          }
          delete: {
            args: Prisma.TaskSubmissionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>
          }
          update: {
            args: Prisma.TaskSubmissionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>
          }
          deleteMany: {
            args: Prisma.TaskSubmissionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskSubmissionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskSubmissionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>[]
          }
          upsert: {
            args: Prisma.TaskSubmissionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskSubmissionPayload>
          }
          aggregate: {
            args: Prisma.TaskSubmissionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTaskSubmission>
          }
          groupBy: {
            args: Prisma.TaskSubmissionGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskSubmissionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskSubmissionCountArgs<ExtArgs>
            result: $Utils.Optional<TaskSubmissionCountAggregateOutputType> | number
          }
        }
      }
      TaskActivity: {
        payload: Prisma.$TaskActivityPayload<ExtArgs>
        fields: Prisma.TaskActivityFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskActivityFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskActivityFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>
          }
          findFirst: {
            args: Prisma.TaskActivityFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskActivityFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>
          }
          findMany: {
            args: Prisma.TaskActivityFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>[]
          }
          create: {
            args: Prisma.TaskActivityCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>
          }
          createMany: {
            args: Prisma.TaskActivityCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskActivityCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>[]
          }
          delete: {
            args: Prisma.TaskActivityDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>
          }
          update: {
            args: Prisma.TaskActivityUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>
          }
          deleteMany: {
            args: Prisma.TaskActivityDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskActivityUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskActivityUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>[]
          }
          upsert: {
            args: Prisma.TaskActivityUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskActivityPayload>
          }
          aggregate: {
            args: Prisma.TaskActivityAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTaskActivity>
          }
          groupBy: {
            args: Prisma.TaskActivityGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskActivityGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskActivityCountArgs<ExtArgs>
            result: $Utils.Optional<TaskActivityCountAggregateOutputType> | number
          }
        }
      }
      Permission: {
        payload: Prisma.$PermissionPayload<ExtArgs>
        fields: Prisma.PermissionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PermissionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PermissionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>
          }
          findFirst: {
            args: Prisma.PermissionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PermissionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>
          }
          findMany: {
            args: Prisma.PermissionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>[]
          }
          create: {
            args: Prisma.PermissionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>
          }
          createMany: {
            args: Prisma.PermissionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PermissionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>[]
          }
          delete: {
            args: Prisma.PermissionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>
          }
          update: {
            args: Prisma.PermissionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>
          }
          deleteMany: {
            args: Prisma.PermissionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PermissionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PermissionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>[]
          }
          upsert: {
            args: Prisma.PermissionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermissionPayload>
          }
          aggregate: {
            args: Prisma.PermissionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePermission>
          }
          groupBy: {
            args: Prisma.PermissionGroupByArgs<ExtArgs>
            result: $Utils.Optional<PermissionGroupByOutputType>[]
          }
          count: {
            args: Prisma.PermissionCountArgs<ExtArgs>
            result: $Utils.Optional<PermissionCountAggregateOutputType> | number
          }
        }
      }
      UserInstallationPermission: {
        payload: Prisma.$UserInstallationPermissionPayload<ExtArgs>
        fields: Prisma.UserInstallationPermissionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserInstallationPermissionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserInstallationPermissionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>
          }
          findFirst: {
            args: Prisma.UserInstallationPermissionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserInstallationPermissionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>
          }
          findMany: {
            args: Prisma.UserInstallationPermissionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>[]
          }
          create: {
            args: Prisma.UserInstallationPermissionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>
          }
          createMany: {
            args: Prisma.UserInstallationPermissionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserInstallationPermissionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>[]
          }
          delete: {
            args: Prisma.UserInstallationPermissionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>
          }
          update: {
            args: Prisma.UserInstallationPermissionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>
          }
          deleteMany: {
            args: Prisma.UserInstallationPermissionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserInstallationPermissionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserInstallationPermissionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>[]
          }
          upsert: {
            args: Prisma.UserInstallationPermissionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserInstallationPermissionPayload>
          }
          aggregate: {
            args: Prisma.UserInstallationPermissionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserInstallationPermission>
          }
          groupBy: {
            args: Prisma.UserInstallationPermissionGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserInstallationPermissionGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserInstallationPermissionCountArgs<ExtArgs>
            result: $Utils.Optional<UserInstallationPermissionCountAggregateOutputType> | number
          }
        }
      }
      Transaction: {
        payload: Prisma.$TransactionPayload<ExtArgs>
        fields: Prisma.TransactionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TransactionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TransactionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findFirst: {
            args: Prisma.TransactionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TransactionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findMany: {
            args: Prisma.TransactionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          create: {
            args: Prisma.TransactionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          createMany: {
            args: Prisma.TransactionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TransactionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          delete: {
            args: Prisma.TransactionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          update: {
            args: Prisma.TransactionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          deleteMany: {
            args: Prisma.TransactionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TransactionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TransactionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          upsert: {
            args: Prisma.TransactionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          aggregate: {
            args: Prisma.TransactionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTransaction>
          }
          groupBy: {
            args: Prisma.TransactionGroupByArgs<ExtArgs>
            result: $Utils.Optional<TransactionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TransactionCountArgs<ExtArgs>
            result: $Utils.Optional<TransactionCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    contributionSummary?: ContributionSummaryOmit
    subscriptionPackage?: SubscriptionPackageOmit
    installation?: InstallationOmit
    task?: TaskOmit
    taskSubmission?: TaskSubmissionOmit
    taskActivity?: TaskActivityOmit
    permission?: PermissionOmit
    userInstallationPermission?: UserInstallationPermissionOmit
    transaction?: TransactionOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    createdTasks: number
    contributedTasks: number
    installations: number
    userInstallationPermissions: number
    transactions: number
    tasksAppliedFor: number
    taskSubmissions: number
    taskActivities: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdTasks?: boolean | UserCountOutputTypeCountCreatedTasksArgs
    contributedTasks?: boolean | UserCountOutputTypeCountContributedTasksArgs
    installations?: boolean | UserCountOutputTypeCountInstallationsArgs
    userInstallationPermissions?: boolean | UserCountOutputTypeCountUserInstallationPermissionsArgs
    transactions?: boolean | UserCountOutputTypeCountTransactionsArgs
    tasksAppliedFor?: boolean | UserCountOutputTypeCountTasksAppliedForArgs
    taskSubmissions?: boolean | UserCountOutputTypeCountTaskSubmissionsArgs
    taskActivities?: boolean | UserCountOutputTypeCountTaskActivitiesArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCreatedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountContributedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountInstallationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstallationWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUserInstallationPermissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserInstallationPermissionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTasksAppliedForArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTaskSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskSubmissionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTaskActivitiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskActivityWhereInput
  }


  /**
   * Count Type SubscriptionPackageCountOutputType
   */

  export type SubscriptionPackageCountOutputType = {
    installations: number
  }

  export type SubscriptionPackageCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    installations?: boolean | SubscriptionPackageCountOutputTypeCountInstallationsArgs
  }

  // Custom InputTypes
  /**
   * SubscriptionPackageCountOutputType without action
   */
  export type SubscriptionPackageCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackageCountOutputType
     */
    select?: SubscriptionPackageCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * SubscriptionPackageCountOutputType without action
   */
  export type SubscriptionPackageCountOutputTypeCountInstallationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstallationWhereInput
  }


  /**
   * Count Type InstallationCountOutputType
   */

  export type InstallationCountOutputType = {
    tasks: number
    users: number
    userInstallationPermissions: number
    transactions: number
    taskSubmissions: number
  }

  export type InstallationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tasks?: boolean | InstallationCountOutputTypeCountTasksArgs
    users?: boolean | InstallationCountOutputTypeCountUsersArgs
    userInstallationPermissions?: boolean | InstallationCountOutputTypeCountUserInstallationPermissionsArgs
    transactions?: boolean | InstallationCountOutputTypeCountTransactionsArgs
    taskSubmissions?: boolean | InstallationCountOutputTypeCountTaskSubmissionsArgs
  }

  // Custom InputTypes
  /**
   * InstallationCountOutputType without action
   */
  export type InstallationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstallationCountOutputType
     */
    select?: InstallationCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * InstallationCountOutputType without action
   */
  export type InstallationCountOutputTypeCountTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * InstallationCountOutputType without action
   */
  export type InstallationCountOutputTypeCountUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
  }

  /**
   * InstallationCountOutputType without action
   */
  export type InstallationCountOutputTypeCountUserInstallationPermissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserInstallationPermissionWhereInput
  }

  /**
   * InstallationCountOutputType without action
   */
  export type InstallationCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * InstallationCountOutputType without action
   */
  export type InstallationCountOutputTypeCountTaskSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskSubmissionWhereInput
  }


  /**
   * Count Type TaskCountOutputType
   */

  export type TaskCountOutputType = {
    applications: number
    transactions: number
    taskSubmissions: number
    taskActivities: number
  }

  export type TaskCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    applications?: boolean | TaskCountOutputTypeCountApplicationsArgs
    transactions?: boolean | TaskCountOutputTypeCountTransactionsArgs
    taskSubmissions?: boolean | TaskCountOutputTypeCountTaskSubmissionsArgs
    taskActivities?: boolean | TaskCountOutputTypeCountTaskActivitiesArgs
  }

  // Custom InputTypes
  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCountOutputType
     */
    select?: TaskCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountApplicationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
  }

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountTaskSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskSubmissionWhereInput
  }

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountTaskActivitiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskActivityWhereInput
  }


  /**
   * Count Type TaskSubmissionCountOutputType
   */

  export type TaskSubmissionCountOutputType = {
    taskActivities: number
  }

  export type TaskSubmissionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    taskActivities?: boolean | TaskSubmissionCountOutputTypeCountTaskActivitiesArgs
  }

  // Custom InputTypes
  /**
   * TaskSubmissionCountOutputType without action
   */
  export type TaskSubmissionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmissionCountOutputType
     */
    select?: TaskSubmissionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TaskSubmissionCountOutputType without action
   */
  export type TaskSubmissionCountOutputTypeCountTaskActivitiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskActivityWhereInput
  }


  /**
   * Count Type PermissionCountOutputType
   */

  export type PermissionCountOutputType = {
    userInstallationPermissions: number
  }

  export type PermissionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userInstallationPermissions?: boolean | PermissionCountOutputTypeCountUserInstallationPermissionsArgs
  }

  // Custom InputTypes
  /**
   * PermissionCountOutputType without action
   */
  export type PermissionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PermissionCountOutputType
     */
    select?: PermissionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PermissionCountOutputType without action
   */
  export type PermissionCountOutputTypeCountUserInstallationPermissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserInstallationPermissionWhereInput
  }


  /**
   * Count Type UserInstallationPermissionCountOutputType
   */

  export type UserInstallationPermissionCountOutputType = {
    permissions: number
  }

  export type UserInstallationPermissionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    permissions?: boolean | UserInstallationPermissionCountOutputTypeCountPermissionsArgs
  }

  // Custom InputTypes
  /**
   * UserInstallationPermissionCountOutputType without action
   */
  export type UserInstallationPermissionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermissionCountOutputType
     */
    select?: UserInstallationPermissionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserInstallationPermissionCountOutputType without action
   */
  export type UserInstallationPermissionCountOutputTypeCountPermissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PermissionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    userId: string | null
    username: string | null
    walletAddress: string | null
    walletSecret: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    userId: string | null
    username: string | null
    walletAddress: string | null
    walletSecret: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    userId: number
    username: number
    walletAddress: number
    walletSecret: number
    addressBook: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    userId?: true
    username?: true
    walletAddress?: true
    walletSecret?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    userId?: true
    username?: true
    walletAddress?: true
    walletSecret?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    userId?: true
    username?: true
    walletAddress?: true
    walletSecret?: true
    addressBook?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook: JsonValue[]
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    username?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    addressBook?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    contributionSummary?: boolean | User$contributionSummaryArgs<ExtArgs>
    createdTasks?: boolean | User$createdTasksArgs<ExtArgs>
    contributedTasks?: boolean | User$contributedTasksArgs<ExtArgs>
    installations?: boolean | User$installationsArgs<ExtArgs>
    userInstallationPermissions?: boolean | User$userInstallationPermissionsArgs<ExtArgs>
    transactions?: boolean | User$transactionsArgs<ExtArgs>
    tasksAppliedFor?: boolean | User$tasksAppliedForArgs<ExtArgs>
    taskSubmissions?: boolean | User$taskSubmissionsArgs<ExtArgs>
    taskActivities?: boolean | User$taskActivitiesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    username?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    addressBook?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    username?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    addressBook?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    userId?: boolean
    username?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    addressBook?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userId" | "username" | "walletAddress" | "walletSecret" | "addressBook" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    contributionSummary?: boolean | User$contributionSummaryArgs<ExtArgs>
    createdTasks?: boolean | User$createdTasksArgs<ExtArgs>
    contributedTasks?: boolean | User$contributedTasksArgs<ExtArgs>
    installations?: boolean | User$installationsArgs<ExtArgs>
    userInstallationPermissions?: boolean | User$userInstallationPermissionsArgs<ExtArgs>
    transactions?: boolean | User$transactionsArgs<ExtArgs>
    tasksAppliedFor?: boolean | User$tasksAppliedForArgs<ExtArgs>
    taskSubmissions?: boolean | User$taskSubmissionsArgs<ExtArgs>
    taskActivities?: boolean | User$taskActivitiesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      contributionSummary: Prisma.$ContributionSummaryPayload<ExtArgs> | null
      createdTasks: Prisma.$TaskPayload<ExtArgs>[]
      contributedTasks: Prisma.$TaskPayload<ExtArgs>[]
      installations: Prisma.$InstallationPayload<ExtArgs>[]
      userInstallationPermissions: Prisma.$UserInstallationPermissionPayload<ExtArgs>[]
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      tasksAppliedFor: Prisma.$TaskPayload<ExtArgs>[]
      taskSubmissions: Prisma.$TaskSubmissionPayload<ExtArgs>[]
      taskActivities: Prisma.$TaskActivityPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      userId: string
      username: string
      walletAddress: string
      walletSecret: string
      addressBook: Prisma.JsonValue[]
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `userId`
     * const userWithUserIdOnly = await prisma.user.findMany({ select: { userId: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `userId`
     * const userWithUserIdOnly = await prisma.user.createManyAndReturn({
     *   select: { userId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `userId`
     * const userWithUserIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { userId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    contributionSummary<T extends User$contributionSummaryArgs<ExtArgs> = {}>(args?: Subset<T, User$contributionSummaryArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    createdTasks<T extends User$createdTasksArgs<ExtArgs> = {}>(args?: Subset<T, User$createdTasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    contributedTasks<T extends User$contributedTasksArgs<ExtArgs> = {}>(args?: Subset<T, User$contributedTasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    installations<T extends User$installationsArgs<ExtArgs> = {}>(args?: Subset<T, User$installationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    userInstallationPermissions<T extends User$userInstallationPermissionsArgs<ExtArgs> = {}>(args?: Subset<T, User$userInstallationPermissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    transactions<T extends User$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, User$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tasksAppliedFor<T extends User$tasksAppliedForArgs<ExtArgs> = {}>(args?: Subset<T, User$tasksAppliedForArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    taskSubmissions<T extends User$taskSubmissionsArgs<ExtArgs> = {}>(args?: Subset<T, User$taskSubmissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    taskActivities<T extends User$taskActivitiesArgs<ExtArgs> = {}>(args?: Subset<T, User$taskActivitiesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly userId: FieldRef<"User", 'String'>
    readonly username: FieldRef<"User", 'String'>
    readonly walletAddress: FieldRef<"User", 'String'>
    readonly walletSecret: FieldRef<"User", 'String'>
    readonly addressBook: FieldRef<"User", 'Json[]'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.contributionSummary
   */
  export type User$contributionSummaryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    where?: ContributionSummaryWhereInput
  }

  /**
   * User.createdTasks
   */
  export type User$createdTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * User.contributedTasks
   */
  export type User$contributedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * User.installations
   */
  export type User$installationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    where?: InstallationWhereInput
    orderBy?: InstallationOrderByWithRelationInput | InstallationOrderByWithRelationInput[]
    cursor?: InstallationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstallationScalarFieldEnum | InstallationScalarFieldEnum[]
  }

  /**
   * User.userInstallationPermissions
   */
  export type User$userInstallationPermissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    where?: UserInstallationPermissionWhereInput
    orderBy?: UserInstallationPermissionOrderByWithRelationInput | UserInstallationPermissionOrderByWithRelationInput[]
    cursor?: UserInstallationPermissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserInstallationPermissionScalarFieldEnum | UserInstallationPermissionScalarFieldEnum[]
  }

  /**
   * User.transactions
   */
  export type User$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * User.tasksAppliedFor
   */
  export type User$tasksAppliedForArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * User.taskSubmissions
   */
  export type User$taskSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    where?: TaskSubmissionWhereInput
    orderBy?: TaskSubmissionOrderByWithRelationInput | TaskSubmissionOrderByWithRelationInput[]
    cursor?: TaskSubmissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskSubmissionScalarFieldEnum | TaskSubmissionScalarFieldEnum[]
  }

  /**
   * User.taskActivities
   */
  export type User$taskActivitiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    where?: TaskActivityWhereInput
    orderBy?: TaskActivityOrderByWithRelationInput | TaskActivityOrderByWithRelationInput[]
    cursor?: TaskActivityWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskActivityScalarFieldEnum | TaskActivityScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model ContributionSummary
   */

  export type AggregateContributionSummary = {
    _count: ContributionSummaryCountAggregateOutputType | null
    _avg: ContributionSummaryAvgAggregateOutputType | null
    _sum: ContributionSummarySumAggregateOutputType | null
    _min: ContributionSummaryMinAggregateOutputType | null
    _max: ContributionSummaryMaxAggregateOutputType | null
  }

  export type ContributionSummaryAvgAggregateOutputType = {
    tasksCompleted: number | null
    activeTasks: number | null
    totalEarnings: number | null
  }

  export type ContributionSummarySumAggregateOutputType = {
    tasksCompleted: number | null
    activeTasks: number | null
    totalEarnings: number | null
  }

  export type ContributionSummaryMinAggregateOutputType = {
    id: string | null
    tasksCompleted: number | null
    activeTasks: number | null
    totalEarnings: number | null
    userId: string | null
  }

  export type ContributionSummaryMaxAggregateOutputType = {
    id: string | null
    tasksCompleted: number | null
    activeTasks: number | null
    totalEarnings: number | null
    userId: string | null
  }

  export type ContributionSummaryCountAggregateOutputType = {
    id: number
    tasksCompleted: number
    activeTasks: number
    totalEarnings: number
    userId: number
    _all: number
  }


  export type ContributionSummaryAvgAggregateInputType = {
    tasksCompleted?: true
    activeTasks?: true
    totalEarnings?: true
  }

  export type ContributionSummarySumAggregateInputType = {
    tasksCompleted?: true
    activeTasks?: true
    totalEarnings?: true
  }

  export type ContributionSummaryMinAggregateInputType = {
    id?: true
    tasksCompleted?: true
    activeTasks?: true
    totalEarnings?: true
    userId?: true
  }

  export type ContributionSummaryMaxAggregateInputType = {
    id?: true
    tasksCompleted?: true
    activeTasks?: true
    totalEarnings?: true
    userId?: true
  }

  export type ContributionSummaryCountAggregateInputType = {
    id?: true
    tasksCompleted?: true
    activeTasks?: true
    totalEarnings?: true
    userId?: true
    _all?: true
  }

  export type ContributionSummaryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContributionSummary to aggregate.
     */
    where?: ContributionSummaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContributionSummaries to fetch.
     */
    orderBy?: ContributionSummaryOrderByWithRelationInput | ContributionSummaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ContributionSummaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContributionSummaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContributionSummaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ContributionSummaries
    **/
    _count?: true | ContributionSummaryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ContributionSummaryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ContributionSummarySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ContributionSummaryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ContributionSummaryMaxAggregateInputType
  }

  export type GetContributionSummaryAggregateType<T extends ContributionSummaryAggregateArgs> = {
        [P in keyof T & keyof AggregateContributionSummary]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateContributionSummary[P]>
      : GetScalarType<T[P], AggregateContributionSummary[P]>
  }




  export type ContributionSummaryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContributionSummaryWhereInput
    orderBy?: ContributionSummaryOrderByWithAggregationInput | ContributionSummaryOrderByWithAggregationInput[]
    by: ContributionSummaryScalarFieldEnum[] | ContributionSummaryScalarFieldEnum
    having?: ContributionSummaryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ContributionSummaryCountAggregateInputType | true
    _avg?: ContributionSummaryAvgAggregateInputType
    _sum?: ContributionSummarySumAggregateInputType
    _min?: ContributionSummaryMinAggregateInputType
    _max?: ContributionSummaryMaxAggregateInputType
  }

  export type ContributionSummaryGroupByOutputType = {
    id: string
    tasksCompleted: number
    activeTasks: number
    totalEarnings: number
    userId: string
    _count: ContributionSummaryCountAggregateOutputType | null
    _avg: ContributionSummaryAvgAggregateOutputType | null
    _sum: ContributionSummarySumAggregateOutputType | null
    _min: ContributionSummaryMinAggregateOutputType | null
    _max: ContributionSummaryMaxAggregateOutputType | null
  }

  type GetContributionSummaryGroupByPayload<T extends ContributionSummaryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ContributionSummaryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ContributionSummaryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ContributionSummaryGroupByOutputType[P]>
            : GetScalarType<T[P], ContributionSummaryGroupByOutputType[P]>
        }
      >
    >


  export type ContributionSummarySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tasksCompleted?: boolean
    activeTasks?: boolean
    totalEarnings?: boolean
    userId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contributionSummary"]>

  export type ContributionSummarySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tasksCompleted?: boolean
    activeTasks?: boolean
    totalEarnings?: boolean
    userId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contributionSummary"]>

  export type ContributionSummarySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tasksCompleted?: boolean
    activeTasks?: boolean
    totalEarnings?: boolean
    userId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contributionSummary"]>

  export type ContributionSummarySelectScalar = {
    id?: boolean
    tasksCompleted?: boolean
    activeTasks?: boolean
    totalEarnings?: boolean
    userId?: boolean
  }

  export type ContributionSummaryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "tasksCompleted" | "activeTasks" | "totalEarnings" | "userId", ExtArgs["result"]["contributionSummary"]>
  export type ContributionSummaryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ContributionSummaryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ContributionSummaryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ContributionSummaryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ContributionSummary"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      tasksCompleted: number
      activeTasks: number
      totalEarnings: number
      userId: string
    }, ExtArgs["result"]["contributionSummary"]>
    composites: {}
  }

  type ContributionSummaryGetPayload<S extends boolean | null | undefined | ContributionSummaryDefaultArgs> = $Result.GetResult<Prisma.$ContributionSummaryPayload, S>

  type ContributionSummaryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ContributionSummaryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ContributionSummaryCountAggregateInputType | true
    }

  export interface ContributionSummaryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ContributionSummary'], meta: { name: 'ContributionSummary' } }
    /**
     * Find zero or one ContributionSummary that matches the filter.
     * @param {ContributionSummaryFindUniqueArgs} args - Arguments to find a ContributionSummary
     * @example
     * // Get one ContributionSummary
     * const contributionSummary = await prisma.contributionSummary.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ContributionSummaryFindUniqueArgs>(args: SelectSubset<T, ContributionSummaryFindUniqueArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ContributionSummary that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ContributionSummaryFindUniqueOrThrowArgs} args - Arguments to find a ContributionSummary
     * @example
     * // Get one ContributionSummary
     * const contributionSummary = await prisma.contributionSummary.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ContributionSummaryFindUniqueOrThrowArgs>(args: SelectSubset<T, ContributionSummaryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ContributionSummary that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContributionSummaryFindFirstArgs} args - Arguments to find a ContributionSummary
     * @example
     * // Get one ContributionSummary
     * const contributionSummary = await prisma.contributionSummary.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ContributionSummaryFindFirstArgs>(args?: SelectSubset<T, ContributionSummaryFindFirstArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ContributionSummary that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContributionSummaryFindFirstOrThrowArgs} args - Arguments to find a ContributionSummary
     * @example
     * // Get one ContributionSummary
     * const contributionSummary = await prisma.contributionSummary.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ContributionSummaryFindFirstOrThrowArgs>(args?: SelectSubset<T, ContributionSummaryFindFirstOrThrowArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ContributionSummaries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContributionSummaryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ContributionSummaries
     * const contributionSummaries = await prisma.contributionSummary.findMany()
     * 
     * // Get first 10 ContributionSummaries
     * const contributionSummaries = await prisma.contributionSummary.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const contributionSummaryWithIdOnly = await prisma.contributionSummary.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ContributionSummaryFindManyArgs>(args?: SelectSubset<T, ContributionSummaryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ContributionSummary.
     * @param {ContributionSummaryCreateArgs} args - Arguments to create a ContributionSummary.
     * @example
     * // Create one ContributionSummary
     * const ContributionSummary = await prisma.contributionSummary.create({
     *   data: {
     *     // ... data to create a ContributionSummary
     *   }
     * })
     * 
     */
    create<T extends ContributionSummaryCreateArgs>(args: SelectSubset<T, ContributionSummaryCreateArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ContributionSummaries.
     * @param {ContributionSummaryCreateManyArgs} args - Arguments to create many ContributionSummaries.
     * @example
     * // Create many ContributionSummaries
     * const contributionSummary = await prisma.contributionSummary.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ContributionSummaryCreateManyArgs>(args?: SelectSubset<T, ContributionSummaryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ContributionSummaries and returns the data saved in the database.
     * @param {ContributionSummaryCreateManyAndReturnArgs} args - Arguments to create many ContributionSummaries.
     * @example
     * // Create many ContributionSummaries
     * const contributionSummary = await prisma.contributionSummary.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ContributionSummaries and only return the `id`
     * const contributionSummaryWithIdOnly = await prisma.contributionSummary.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ContributionSummaryCreateManyAndReturnArgs>(args?: SelectSubset<T, ContributionSummaryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ContributionSummary.
     * @param {ContributionSummaryDeleteArgs} args - Arguments to delete one ContributionSummary.
     * @example
     * // Delete one ContributionSummary
     * const ContributionSummary = await prisma.contributionSummary.delete({
     *   where: {
     *     // ... filter to delete one ContributionSummary
     *   }
     * })
     * 
     */
    delete<T extends ContributionSummaryDeleteArgs>(args: SelectSubset<T, ContributionSummaryDeleteArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ContributionSummary.
     * @param {ContributionSummaryUpdateArgs} args - Arguments to update one ContributionSummary.
     * @example
     * // Update one ContributionSummary
     * const contributionSummary = await prisma.contributionSummary.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ContributionSummaryUpdateArgs>(args: SelectSubset<T, ContributionSummaryUpdateArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ContributionSummaries.
     * @param {ContributionSummaryDeleteManyArgs} args - Arguments to filter ContributionSummaries to delete.
     * @example
     * // Delete a few ContributionSummaries
     * const { count } = await prisma.contributionSummary.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ContributionSummaryDeleteManyArgs>(args?: SelectSubset<T, ContributionSummaryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ContributionSummaries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContributionSummaryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ContributionSummaries
     * const contributionSummary = await prisma.contributionSummary.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ContributionSummaryUpdateManyArgs>(args: SelectSubset<T, ContributionSummaryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ContributionSummaries and returns the data updated in the database.
     * @param {ContributionSummaryUpdateManyAndReturnArgs} args - Arguments to update many ContributionSummaries.
     * @example
     * // Update many ContributionSummaries
     * const contributionSummary = await prisma.contributionSummary.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ContributionSummaries and only return the `id`
     * const contributionSummaryWithIdOnly = await prisma.contributionSummary.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ContributionSummaryUpdateManyAndReturnArgs>(args: SelectSubset<T, ContributionSummaryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ContributionSummary.
     * @param {ContributionSummaryUpsertArgs} args - Arguments to update or create a ContributionSummary.
     * @example
     * // Update or create a ContributionSummary
     * const contributionSummary = await prisma.contributionSummary.upsert({
     *   create: {
     *     // ... data to create a ContributionSummary
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ContributionSummary we want to update
     *   }
     * })
     */
    upsert<T extends ContributionSummaryUpsertArgs>(args: SelectSubset<T, ContributionSummaryUpsertArgs<ExtArgs>>): Prisma__ContributionSummaryClient<$Result.GetResult<Prisma.$ContributionSummaryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ContributionSummaries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContributionSummaryCountArgs} args - Arguments to filter ContributionSummaries to count.
     * @example
     * // Count the number of ContributionSummaries
     * const count = await prisma.contributionSummary.count({
     *   where: {
     *     // ... the filter for the ContributionSummaries we want to count
     *   }
     * })
    **/
    count<T extends ContributionSummaryCountArgs>(
      args?: Subset<T, ContributionSummaryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ContributionSummaryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ContributionSummary.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContributionSummaryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ContributionSummaryAggregateArgs>(args: Subset<T, ContributionSummaryAggregateArgs>): Prisma.PrismaPromise<GetContributionSummaryAggregateType<T>>

    /**
     * Group by ContributionSummary.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContributionSummaryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ContributionSummaryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ContributionSummaryGroupByArgs['orderBy'] }
        : { orderBy?: ContributionSummaryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ContributionSummaryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetContributionSummaryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ContributionSummary model
   */
  readonly fields: ContributionSummaryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ContributionSummary.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ContributionSummaryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ContributionSummary model
   */
  interface ContributionSummaryFieldRefs {
    readonly id: FieldRef<"ContributionSummary", 'String'>
    readonly tasksCompleted: FieldRef<"ContributionSummary", 'Int'>
    readonly activeTasks: FieldRef<"ContributionSummary", 'Int'>
    readonly totalEarnings: FieldRef<"ContributionSummary", 'Float'>
    readonly userId: FieldRef<"ContributionSummary", 'String'>
  }
    

  // Custom InputTypes
  /**
   * ContributionSummary findUnique
   */
  export type ContributionSummaryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * Filter, which ContributionSummary to fetch.
     */
    where: ContributionSummaryWhereUniqueInput
  }

  /**
   * ContributionSummary findUniqueOrThrow
   */
  export type ContributionSummaryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * Filter, which ContributionSummary to fetch.
     */
    where: ContributionSummaryWhereUniqueInput
  }

  /**
   * ContributionSummary findFirst
   */
  export type ContributionSummaryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * Filter, which ContributionSummary to fetch.
     */
    where?: ContributionSummaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContributionSummaries to fetch.
     */
    orderBy?: ContributionSummaryOrderByWithRelationInput | ContributionSummaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContributionSummaries.
     */
    cursor?: ContributionSummaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContributionSummaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContributionSummaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContributionSummaries.
     */
    distinct?: ContributionSummaryScalarFieldEnum | ContributionSummaryScalarFieldEnum[]
  }

  /**
   * ContributionSummary findFirstOrThrow
   */
  export type ContributionSummaryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * Filter, which ContributionSummary to fetch.
     */
    where?: ContributionSummaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContributionSummaries to fetch.
     */
    orderBy?: ContributionSummaryOrderByWithRelationInput | ContributionSummaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContributionSummaries.
     */
    cursor?: ContributionSummaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContributionSummaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContributionSummaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContributionSummaries.
     */
    distinct?: ContributionSummaryScalarFieldEnum | ContributionSummaryScalarFieldEnum[]
  }

  /**
   * ContributionSummary findMany
   */
  export type ContributionSummaryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * Filter, which ContributionSummaries to fetch.
     */
    where?: ContributionSummaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContributionSummaries to fetch.
     */
    orderBy?: ContributionSummaryOrderByWithRelationInput | ContributionSummaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ContributionSummaries.
     */
    cursor?: ContributionSummaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContributionSummaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContributionSummaries.
     */
    skip?: number
    distinct?: ContributionSummaryScalarFieldEnum | ContributionSummaryScalarFieldEnum[]
  }

  /**
   * ContributionSummary create
   */
  export type ContributionSummaryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * The data needed to create a ContributionSummary.
     */
    data: XOR<ContributionSummaryCreateInput, ContributionSummaryUncheckedCreateInput>
  }

  /**
   * ContributionSummary createMany
   */
  export type ContributionSummaryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ContributionSummaries.
     */
    data: ContributionSummaryCreateManyInput | ContributionSummaryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ContributionSummary createManyAndReturn
   */
  export type ContributionSummaryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * The data used to create many ContributionSummaries.
     */
    data: ContributionSummaryCreateManyInput | ContributionSummaryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ContributionSummary update
   */
  export type ContributionSummaryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * The data needed to update a ContributionSummary.
     */
    data: XOR<ContributionSummaryUpdateInput, ContributionSummaryUncheckedUpdateInput>
    /**
     * Choose, which ContributionSummary to update.
     */
    where: ContributionSummaryWhereUniqueInput
  }

  /**
   * ContributionSummary updateMany
   */
  export type ContributionSummaryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ContributionSummaries.
     */
    data: XOR<ContributionSummaryUpdateManyMutationInput, ContributionSummaryUncheckedUpdateManyInput>
    /**
     * Filter which ContributionSummaries to update
     */
    where?: ContributionSummaryWhereInput
    /**
     * Limit how many ContributionSummaries to update.
     */
    limit?: number
  }

  /**
   * ContributionSummary updateManyAndReturn
   */
  export type ContributionSummaryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * The data used to update ContributionSummaries.
     */
    data: XOR<ContributionSummaryUpdateManyMutationInput, ContributionSummaryUncheckedUpdateManyInput>
    /**
     * Filter which ContributionSummaries to update
     */
    where?: ContributionSummaryWhereInput
    /**
     * Limit how many ContributionSummaries to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ContributionSummary upsert
   */
  export type ContributionSummaryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * The filter to search for the ContributionSummary to update in case it exists.
     */
    where: ContributionSummaryWhereUniqueInput
    /**
     * In case the ContributionSummary found by the `where` argument doesn't exist, create a new ContributionSummary with this data.
     */
    create: XOR<ContributionSummaryCreateInput, ContributionSummaryUncheckedCreateInput>
    /**
     * In case the ContributionSummary was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ContributionSummaryUpdateInput, ContributionSummaryUncheckedUpdateInput>
  }

  /**
   * ContributionSummary delete
   */
  export type ContributionSummaryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
    /**
     * Filter which ContributionSummary to delete.
     */
    where: ContributionSummaryWhereUniqueInput
  }

  /**
   * ContributionSummary deleteMany
   */
  export type ContributionSummaryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContributionSummaries to delete
     */
    where?: ContributionSummaryWhereInput
    /**
     * Limit how many ContributionSummaries to delete.
     */
    limit?: number
  }

  /**
   * ContributionSummary without action
   */
  export type ContributionSummaryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContributionSummary
     */
    select?: ContributionSummarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContributionSummary
     */
    omit?: ContributionSummaryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContributionSummaryInclude<ExtArgs> | null
  }


  /**
   * Model SubscriptionPackage
   */

  export type AggregateSubscriptionPackage = {
    _count: SubscriptionPackageCountAggregateOutputType | null
    _avg: SubscriptionPackageAvgAggregateOutputType | null
    _sum: SubscriptionPackageSumAggregateOutputType | null
    _min: SubscriptionPackageMinAggregateOutputType | null
    _max: SubscriptionPackageMaxAggregateOutputType | null
  }

  export type SubscriptionPackageAvgAggregateOutputType = {
    maxTasks: number | null
    maxUsers: number | null
    price: number | null
  }

  export type SubscriptionPackageSumAggregateOutputType = {
    maxTasks: number | null
    maxUsers: number | null
    price: number | null
  }

  export type SubscriptionPackageMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    maxTasks: number | null
    maxUsers: number | null
    paid: boolean | null
    price: number | null
    active: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionPackageMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    maxTasks: number | null
    maxUsers: number | null
    paid: boolean | null
    price: number | null
    active: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionPackageCountAggregateOutputType = {
    id: number
    name: number
    description: number
    maxTasks: number
    maxUsers: number
    paid: number
    price: number
    active: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SubscriptionPackageAvgAggregateInputType = {
    maxTasks?: true
    maxUsers?: true
    price?: true
  }

  export type SubscriptionPackageSumAggregateInputType = {
    maxTasks?: true
    maxUsers?: true
    price?: true
  }

  export type SubscriptionPackageMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    maxTasks?: true
    maxUsers?: true
    paid?: true
    price?: true
    active?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionPackageMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    maxTasks?: true
    maxUsers?: true
    paid?: true
    price?: true
    active?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionPackageCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    maxTasks?: true
    maxUsers?: true
    paid?: true
    price?: true
    active?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SubscriptionPackageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SubscriptionPackage to aggregate.
     */
    where?: SubscriptionPackageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubscriptionPackages to fetch.
     */
    orderBy?: SubscriptionPackageOrderByWithRelationInput | SubscriptionPackageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubscriptionPackageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubscriptionPackages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubscriptionPackages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SubscriptionPackages
    **/
    _count?: true | SubscriptionPackageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubscriptionPackageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubscriptionPackageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubscriptionPackageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubscriptionPackageMaxAggregateInputType
  }

  export type GetSubscriptionPackageAggregateType<T extends SubscriptionPackageAggregateArgs> = {
        [P in keyof T & keyof AggregateSubscriptionPackage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubscriptionPackage[P]>
      : GetScalarType<T[P], AggregateSubscriptionPackage[P]>
  }




  export type SubscriptionPackageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionPackageWhereInput
    orderBy?: SubscriptionPackageOrderByWithAggregationInput | SubscriptionPackageOrderByWithAggregationInput[]
    by: SubscriptionPackageScalarFieldEnum[] | SubscriptionPackageScalarFieldEnum
    having?: SubscriptionPackageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubscriptionPackageCountAggregateInputType | true
    _avg?: SubscriptionPackageAvgAggregateInputType
    _sum?: SubscriptionPackageSumAggregateInputType
    _min?: SubscriptionPackageMinAggregateInputType
    _max?: SubscriptionPackageMaxAggregateInputType
  }

  export type SubscriptionPackageGroupByOutputType = {
    id: string
    name: string
    description: string
    maxTasks: number
    maxUsers: number
    paid: boolean
    price: number
    active: boolean
    createdAt: Date
    updatedAt: Date
    _count: SubscriptionPackageCountAggregateOutputType | null
    _avg: SubscriptionPackageAvgAggregateOutputType | null
    _sum: SubscriptionPackageSumAggregateOutputType | null
    _min: SubscriptionPackageMinAggregateOutputType | null
    _max: SubscriptionPackageMaxAggregateOutputType | null
  }

  type GetSubscriptionPackageGroupByPayload<T extends SubscriptionPackageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubscriptionPackageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubscriptionPackageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubscriptionPackageGroupByOutputType[P]>
            : GetScalarType<T[P], SubscriptionPackageGroupByOutputType[P]>
        }
      >
    >


  export type SubscriptionPackageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    maxTasks?: boolean
    maxUsers?: boolean
    paid?: boolean
    price?: boolean
    active?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    installations?: boolean | SubscriptionPackage$installationsArgs<ExtArgs>
    _count?: boolean | SubscriptionPackageCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["subscriptionPackage"]>

  export type SubscriptionPackageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    maxTasks?: boolean
    maxUsers?: boolean
    paid?: boolean
    price?: boolean
    active?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["subscriptionPackage"]>

  export type SubscriptionPackageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    maxTasks?: boolean
    maxUsers?: boolean
    paid?: boolean
    price?: boolean
    active?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["subscriptionPackage"]>

  export type SubscriptionPackageSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    maxTasks?: boolean
    maxUsers?: boolean
    paid?: boolean
    price?: boolean
    active?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SubscriptionPackageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "description" | "maxTasks" | "maxUsers" | "paid" | "price" | "active" | "createdAt" | "updatedAt", ExtArgs["result"]["subscriptionPackage"]>
  export type SubscriptionPackageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    installations?: boolean | SubscriptionPackage$installationsArgs<ExtArgs>
    _count?: boolean | SubscriptionPackageCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type SubscriptionPackageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type SubscriptionPackageIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $SubscriptionPackagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SubscriptionPackage"
    objects: {
      installations: Prisma.$InstallationPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string
      maxTasks: number
      maxUsers: number
      paid: boolean
      price: number
      active: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["subscriptionPackage"]>
    composites: {}
  }

  type SubscriptionPackageGetPayload<S extends boolean | null | undefined | SubscriptionPackageDefaultArgs> = $Result.GetResult<Prisma.$SubscriptionPackagePayload, S>

  type SubscriptionPackageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SubscriptionPackageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubscriptionPackageCountAggregateInputType | true
    }

  export interface SubscriptionPackageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SubscriptionPackage'], meta: { name: 'SubscriptionPackage' } }
    /**
     * Find zero or one SubscriptionPackage that matches the filter.
     * @param {SubscriptionPackageFindUniqueArgs} args - Arguments to find a SubscriptionPackage
     * @example
     * // Get one SubscriptionPackage
     * const subscriptionPackage = await prisma.subscriptionPackage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubscriptionPackageFindUniqueArgs>(args: SelectSubset<T, SubscriptionPackageFindUniqueArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SubscriptionPackage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubscriptionPackageFindUniqueOrThrowArgs} args - Arguments to find a SubscriptionPackage
     * @example
     * // Get one SubscriptionPackage
     * const subscriptionPackage = await prisma.subscriptionPackage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubscriptionPackageFindUniqueOrThrowArgs>(args: SelectSubset<T, SubscriptionPackageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SubscriptionPackage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionPackageFindFirstArgs} args - Arguments to find a SubscriptionPackage
     * @example
     * // Get one SubscriptionPackage
     * const subscriptionPackage = await prisma.subscriptionPackage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubscriptionPackageFindFirstArgs>(args?: SelectSubset<T, SubscriptionPackageFindFirstArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SubscriptionPackage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionPackageFindFirstOrThrowArgs} args - Arguments to find a SubscriptionPackage
     * @example
     * // Get one SubscriptionPackage
     * const subscriptionPackage = await prisma.subscriptionPackage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubscriptionPackageFindFirstOrThrowArgs>(args?: SelectSubset<T, SubscriptionPackageFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SubscriptionPackages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionPackageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SubscriptionPackages
     * const subscriptionPackages = await prisma.subscriptionPackage.findMany()
     * 
     * // Get first 10 SubscriptionPackages
     * const subscriptionPackages = await prisma.subscriptionPackage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const subscriptionPackageWithIdOnly = await prisma.subscriptionPackage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubscriptionPackageFindManyArgs>(args?: SelectSubset<T, SubscriptionPackageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SubscriptionPackage.
     * @param {SubscriptionPackageCreateArgs} args - Arguments to create a SubscriptionPackage.
     * @example
     * // Create one SubscriptionPackage
     * const SubscriptionPackage = await prisma.subscriptionPackage.create({
     *   data: {
     *     // ... data to create a SubscriptionPackage
     *   }
     * })
     * 
     */
    create<T extends SubscriptionPackageCreateArgs>(args: SelectSubset<T, SubscriptionPackageCreateArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SubscriptionPackages.
     * @param {SubscriptionPackageCreateManyArgs} args - Arguments to create many SubscriptionPackages.
     * @example
     * // Create many SubscriptionPackages
     * const subscriptionPackage = await prisma.subscriptionPackage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubscriptionPackageCreateManyArgs>(args?: SelectSubset<T, SubscriptionPackageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SubscriptionPackages and returns the data saved in the database.
     * @param {SubscriptionPackageCreateManyAndReturnArgs} args - Arguments to create many SubscriptionPackages.
     * @example
     * // Create many SubscriptionPackages
     * const subscriptionPackage = await prisma.subscriptionPackage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SubscriptionPackages and only return the `id`
     * const subscriptionPackageWithIdOnly = await prisma.subscriptionPackage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubscriptionPackageCreateManyAndReturnArgs>(args?: SelectSubset<T, SubscriptionPackageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SubscriptionPackage.
     * @param {SubscriptionPackageDeleteArgs} args - Arguments to delete one SubscriptionPackage.
     * @example
     * // Delete one SubscriptionPackage
     * const SubscriptionPackage = await prisma.subscriptionPackage.delete({
     *   where: {
     *     // ... filter to delete one SubscriptionPackage
     *   }
     * })
     * 
     */
    delete<T extends SubscriptionPackageDeleteArgs>(args: SelectSubset<T, SubscriptionPackageDeleteArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SubscriptionPackage.
     * @param {SubscriptionPackageUpdateArgs} args - Arguments to update one SubscriptionPackage.
     * @example
     * // Update one SubscriptionPackage
     * const subscriptionPackage = await prisma.subscriptionPackage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubscriptionPackageUpdateArgs>(args: SelectSubset<T, SubscriptionPackageUpdateArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SubscriptionPackages.
     * @param {SubscriptionPackageDeleteManyArgs} args - Arguments to filter SubscriptionPackages to delete.
     * @example
     * // Delete a few SubscriptionPackages
     * const { count } = await prisma.subscriptionPackage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubscriptionPackageDeleteManyArgs>(args?: SelectSubset<T, SubscriptionPackageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SubscriptionPackages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionPackageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SubscriptionPackages
     * const subscriptionPackage = await prisma.subscriptionPackage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubscriptionPackageUpdateManyArgs>(args: SelectSubset<T, SubscriptionPackageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SubscriptionPackages and returns the data updated in the database.
     * @param {SubscriptionPackageUpdateManyAndReturnArgs} args - Arguments to update many SubscriptionPackages.
     * @example
     * // Update many SubscriptionPackages
     * const subscriptionPackage = await prisma.subscriptionPackage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SubscriptionPackages and only return the `id`
     * const subscriptionPackageWithIdOnly = await prisma.subscriptionPackage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SubscriptionPackageUpdateManyAndReturnArgs>(args: SelectSubset<T, SubscriptionPackageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SubscriptionPackage.
     * @param {SubscriptionPackageUpsertArgs} args - Arguments to update or create a SubscriptionPackage.
     * @example
     * // Update or create a SubscriptionPackage
     * const subscriptionPackage = await prisma.subscriptionPackage.upsert({
     *   create: {
     *     // ... data to create a SubscriptionPackage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SubscriptionPackage we want to update
     *   }
     * })
     */
    upsert<T extends SubscriptionPackageUpsertArgs>(args: SelectSubset<T, SubscriptionPackageUpsertArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SubscriptionPackages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionPackageCountArgs} args - Arguments to filter SubscriptionPackages to count.
     * @example
     * // Count the number of SubscriptionPackages
     * const count = await prisma.subscriptionPackage.count({
     *   where: {
     *     // ... the filter for the SubscriptionPackages we want to count
     *   }
     * })
    **/
    count<T extends SubscriptionPackageCountArgs>(
      args?: Subset<T, SubscriptionPackageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubscriptionPackageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SubscriptionPackage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionPackageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubscriptionPackageAggregateArgs>(args: Subset<T, SubscriptionPackageAggregateArgs>): Prisma.PrismaPromise<GetSubscriptionPackageAggregateType<T>>

    /**
     * Group by SubscriptionPackage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionPackageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubscriptionPackageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubscriptionPackageGroupByArgs['orderBy'] }
        : { orderBy?: SubscriptionPackageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubscriptionPackageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubscriptionPackageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SubscriptionPackage model
   */
  readonly fields: SubscriptionPackageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SubscriptionPackage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubscriptionPackageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    installations<T extends SubscriptionPackage$installationsArgs<ExtArgs> = {}>(args?: Subset<T, SubscriptionPackage$installationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SubscriptionPackage model
   */
  interface SubscriptionPackageFieldRefs {
    readonly id: FieldRef<"SubscriptionPackage", 'String'>
    readonly name: FieldRef<"SubscriptionPackage", 'String'>
    readonly description: FieldRef<"SubscriptionPackage", 'String'>
    readonly maxTasks: FieldRef<"SubscriptionPackage", 'Int'>
    readonly maxUsers: FieldRef<"SubscriptionPackage", 'Int'>
    readonly paid: FieldRef<"SubscriptionPackage", 'Boolean'>
    readonly price: FieldRef<"SubscriptionPackage", 'Float'>
    readonly active: FieldRef<"SubscriptionPackage", 'Boolean'>
    readonly createdAt: FieldRef<"SubscriptionPackage", 'DateTime'>
    readonly updatedAt: FieldRef<"SubscriptionPackage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SubscriptionPackage findUnique
   */
  export type SubscriptionPackageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * Filter, which SubscriptionPackage to fetch.
     */
    where: SubscriptionPackageWhereUniqueInput
  }

  /**
   * SubscriptionPackage findUniqueOrThrow
   */
  export type SubscriptionPackageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * Filter, which SubscriptionPackage to fetch.
     */
    where: SubscriptionPackageWhereUniqueInput
  }

  /**
   * SubscriptionPackage findFirst
   */
  export type SubscriptionPackageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * Filter, which SubscriptionPackage to fetch.
     */
    where?: SubscriptionPackageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubscriptionPackages to fetch.
     */
    orderBy?: SubscriptionPackageOrderByWithRelationInput | SubscriptionPackageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SubscriptionPackages.
     */
    cursor?: SubscriptionPackageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubscriptionPackages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubscriptionPackages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SubscriptionPackages.
     */
    distinct?: SubscriptionPackageScalarFieldEnum | SubscriptionPackageScalarFieldEnum[]
  }

  /**
   * SubscriptionPackage findFirstOrThrow
   */
  export type SubscriptionPackageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * Filter, which SubscriptionPackage to fetch.
     */
    where?: SubscriptionPackageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubscriptionPackages to fetch.
     */
    orderBy?: SubscriptionPackageOrderByWithRelationInput | SubscriptionPackageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SubscriptionPackages.
     */
    cursor?: SubscriptionPackageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubscriptionPackages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubscriptionPackages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SubscriptionPackages.
     */
    distinct?: SubscriptionPackageScalarFieldEnum | SubscriptionPackageScalarFieldEnum[]
  }

  /**
   * SubscriptionPackage findMany
   */
  export type SubscriptionPackageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * Filter, which SubscriptionPackages to fetch.
     */
    where?: SubscriptionPackageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubscriptionPackages to fetch.
     */
    orderBy?: SubscriptionPackageOrderByWithRelationInput | SubscriptionPackageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SubscriptionPackages.
     */
    cursor?: SubscriptionPackageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubscriptionPackages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubscriptionPackages.
     */
    skip?: number
    distinct?: SubscriptionPackageScalarFieldEnum | SubscriptionPackageScalarFieldEnum[]
  }

  /**
   * SubscriptionPackage create
   */
  export type SubscriptionPackageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * The data needed to create a SubscriptionPackage.
     */
    data: XOR<SubscriptionPackageCreateInput, SubscriptionPackageUncheckedCreateInput>
  }

  /**
   * SubscriptionPackage createMany
   */
  export type SubscriptionPackageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SubscriptionPackages.
     */
    data: SubscriptionPackageCreateManyInput | SubscriptionPackageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SubscriptionPackage createManyAndReturn
   */
  export type SubscriptionPackageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * The data used to create many SubscriptionPackages.
     */
    data: SubscriptionPackageCreateManyInput | SubscriptionPackageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SubscriptionPackage update
   */
  export type SubscriptionPackageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * The data needed to update a SubscriptionPackage.
     */
    data: XOR<SubscriptionPackageUpdateInput, SubscriptionPackageUncheckedUpdateInput>
    /**
     * Choose, which SubscriptionPackage to update.
     */
    where: SubscriptionPackageWhereUniqueInput
  }

  /**
   * SubscriptionPackage updateMany
   */
  export type SubscriptionPackageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SubscriptionPackages.
     */
    data: XOR<SubscriptionPackageUpdateManyMutationInput, SubscriptionPackageUncheckedUpdateManyInput>
    /**
     * Filter which SubscriptionPackages to update
     */
    where?: SubscriptionPackageWhereInput
    /**
     * Limit how many SubscriptionPackages to update.
     */
    limit?: number
  }

  /**
   * SubscriptionPackage updateManyAndReturn
   */
  export type SubscriptionPackageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * The data used to update SubscriptionPackages.
     */
    data: XOR<SubscriptionPackageUpdateManyMutationInput, SubscriptionPackageUncheckedUpdateManyInput>
    /**
     * Filter which SubscriptionPackages to update
     */
    where?: SubscriptionPackageWhereInput
    /**
     * Limit how many SubscriptionPackages to update.
     */
    limit?: number
  }

  /**
   * SubscriptionPackage upsert
   */
  export type SubscriptionPackageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * The filter to search for the SubscriptionPackage to update in case it exists.
     */
    where: SubscriptionPackageWhereUniqueInput
    /**
     * In case the SubscriptionPackage found by the `where` argument doesn't exist, create a new SubscriptionPackage with this data.
     */
    create: XOR<SubscriptionPackageCreateInput, SubscriptionPackageUncheckedCreateInput>
    /**
     * In case the SubscriptionPackage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubscriptionPackageUpdateInput, SubscriptionPackageUncheckedUpdateInput>
  }

  /**
   * SubscriptionPackage delete
   */
  export type SubscriptionPackageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    /**
     * Filter which SubscriptionPackage to delete.
     */
    where: SubscriptionPackageWhereUniqueInput
  }

  /**
   * SubscriptionPackage deleteMany
   */
  export type SubscriptionPackageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SubscriptionPackages to delete
     */
    where?: SubscriptionPackageWhereInput
    /**
     * Limit how many SubscriptionPackages to delete.
     */
    limit?: number
  }

  /**
   * SubscriptionPackage.installations
   */
  export type SubscriptionPackage$installationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    where?: InstallationWhereInput
    orderBy?: InstallationOrderByWithRelationInput | InstallationOrderByWithRelationInput[]
    cursor?: InstallationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstallationScalarFieldEnum | InstallationScalarFieldEnum[]
  }

  /**
   * SubscriptionPackage without action
   */
  export type SubscriptionPackageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
  }


  /**
   * Model Installation
   */

  export type AggregateInstallation = {
    _count: InstallationCountAggregateOutputType | null
    _avg: InstallationAvgAggregateOutputType | null
    _sum: InstallationSumAggregateOutputType | null
    _min: InstallationMinAggregateOutputType | null
    _max: InstallationMaxAggregateOutputType | null
  }

  export type InstallationAvgAggregateOutputType = {
    targetId: number | null
  }

  export type InstallationSumAggregateOutputType = {
    targetId: number | null
  }

  export type InstallationMinAggregateOutputType = {
    id: string | null
    htmlUrl: string | null
    targetId: number | null
    targetType: string | null
    walletAddress: string | null
    walletSecret: string | null
    escrowAddress: string | null
    escrowSecret: string | null
    subscriptionPackageId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InstallationMaxAggregateOutputType = {
    id: string | null
    htmlUrl: string | null
    targetId: number | null
    targetType: string | null
    walletAddress: string | null
    walletSecret: string | null
    escrowAddress: string | null
    escrowSecret: string | null
    subscriptionPackageId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InstallationCountAggregateOutputType = {
    id: number
    htmlUrl: number
    targetId: number
    targetType: number
    account: number
    walletAddress: number
    walletSecret: number
    escrowAddress: number
    escrowSecret: number
    subscriptionPackageId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type InstallationAvgAggregateInputType = {
    targetId?: true
  }

  export type InstallationSumAggregateInputType = {
    targetId?: true
  }

  export type InstallationMinAggregateInputType = {
    id?: true
    htmlUrl?: true
    targetId?: true
    targetType?: true
    walletAddress?: true
    walletSecret?: true
    escrowAddress?: true
    escrowSecret?: true
    subscriptionPackageId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InstallationMaxAggregateInputType = {
    id?: true
    htmlUrl?: true
    targetId?: true
    targetType?: true
    walletAddress?: true
    walletSecret?: true
    escrowAddress?: true
    escrowSecret?: true
    subscriptionPackageId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InstallationCountAggregateInputType = {
    id?: true
    htmlUrl?: true
    targetId?: true
    targetType?: true
    account?: true
    walletAddress?: true
    walletSecret?: true
    escrowAddress?: true
    escrowSecret?: true
    subscriptionPackageId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type InstallationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Installation to aggregate.
     */
    where?: InstallationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installations to fetch.
     */
    orderBy?: InstallationOrderByWithRelationInput | InstallationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InstallationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Installations
    **/
    _count?: true | InstallationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InstallationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InstallationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InstallationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InstallationMaxAggregateInputType
  }

  export type GetInstallationAggregateType<T extends InstallationAggregateArgs> = {
        [P in keyof T & keyof AggregateInstallation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInstallation[P]>
      : GetScalarType<T[P], AggregateInstallation[P]>
  }




  export type InstallationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstallationWhereInput
    orderBy?: InstallationOrderByWithAggregationInput | InstallationOrderByWithAggregationInput[]
    by: InstallationScalarFieldEnum[] | InstallationScalarFieldEnum
    having?: InstallationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InstallationCountAggregateInputType | true
    _avg?: InstallationAvgAggregateInputType
    _sum?: InstallationSumAggregateInputType
    _min?: InstallationMinAggregateInputType
    _max?: InstallationMaxAggregateInputType
  }

  export type InstallationGroupByOutputType = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId: string | null
    createdAt: Date
    updatedAt: Date
    _count: InstallationCountAggregateOutputType | null
    _avg: InstallationAvgAggregateOutputType | null
    _sum: InstallationSumAggregateOutputType | null
    _min: InstallationMinAggregateOutputType | null
    _max: InstallationMaxAggregateOutputType | null
  }

  type GetInstallationGroupByPayload<T extends InstallationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InstallationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InstallationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InstallationGroupByOutputType[P]>
            : GetScalarType<T[P], InstallationGroupByOutputType[P]>
        }
      >
    >


  export type InstallationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    htmlUrl?: boolean
    targetId?: boolean
    targetType?: boolean
    account?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    escrowAddress?: boolean
    escrowSecret?: boolean
    subscriptionPackageId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subscriptionPackage?: boolean | Installation$subscriptionPackageArgs<ExtArgs>
    tasks?: boolean | Installation$tasksArgs<ExtArgs>
    users?: boolean | Installation$usersArgs<ExtArgs>
    userInstallationPermissions?: boolean | Installation$userInstallationPermissionsArgs<ExtArgs>
    transactions?: boolean | Installation$transactionsArgs<ExtArgs>
    taskSubmissions?: boolean | Installation$taskSubmissionsArgs<ExtArgs>
    _count?: boolean | InstallationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["installation"]>

  export type InstallationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    htmlUrl?: boolean
    targetId?: boolean
    targetType?: boolean
    account?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    escrowAddress?: boolean
    escrowSecret?: boolean
    subscriptionPackageId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subscriptionPackage?: boolean | Installation$subscriptionPackageArgs<ExtArgs>
  }, ExtArgs["result"]["installation"]>

  export type InstallationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    htmlUrl?: boolean
    targetId?: boolean
    targetType?: boolean
    account?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    escrowAddress?: boolean
    escrowSecret?: boolean
    subscriptionPackageId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subscriptionPackage?: boolean | Installation$subscriptionPackageArgs<ExtArgs>
  }, ExtArgs["result"]["installation"]>

  export type InstallationSelectScalar = {
    id?: boolean
    htmlUrl?: boolean
    targetId?: boolean
    targetType?: boolean
    account?: boolean
    walletAddress?: boolean
    walletSecret?: boolean
    escrowAddress?: boolean
    escrowSecret?: boolean
    subscriptionPackageId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type InstallationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "htmlUrl" | "targetId" | "targetType" | "account" | "walletAddress" | "walletSecret" | "escrowAddress" | "escrowSecret" | "subscriptionPackageId" | "createdAt" | "updatedAt", ExtArgs["result"]["installation"]>
  export type InstallationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subscriptionPackage?: boolean | Installation$subscriptionPackageArgs<ExtArgs>
    tasks?: boolean | Installation$tasksArgs<ExtArgs>
    users?: boolean | Installation$usersArgs<ExtArgs>
    userInstallationPermissions?: boolean | Installation$userInstallationPermissionsArgs<ExtArgs>
    transactions?: boolean | Installation$transactionsArgs<ExtArgs>
    taskSubmissions?: boolean | Installation$taskSubmissionsArgs<ExtArgs>
    _count?: boolean | InstallationCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type InstallationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subscriptionPackage?: boolean | Installation$subscriptionPackageArgs<ExtArgs>
  }
  export type InstallationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subscriptionPackage?: boolean | Installation$subscriptionPackageArgs<ExtArgs>
  }

  export type $InstallationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Installation"
    objects: {
      subscriptionPackage: Prisma.$SubscriptionPackagePayload<ExtArgs> | null
      tasks: Prisma.$TaskPayload<ExtArgs>[]
      users: Prisma.$UserPayload<ExtArgs>[]
      userInstallationPermissions: Prisma.$UserInstallationPermissionPayload<ExtArgs>[]
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      taskSubmissions: Prisma.$TaskSubmissionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      htmlUrl: string
      targetId: number
      targetType: string
      account: Prisma.JsonValue
      walletAddress: string
      walletSecret: string
      escrowAddress: string
      escrowSecret: string
      subscriptionPackageId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["installation"]>
    composites: {}
  }

  type InstallationGetPayload<S extends boolean | null | undefined | InstallationDefaultArgs> = $Result.GetResult<Prisma.$InstallationPayload, S>

  type InstallationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InstallationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InstallationCountAggregateInputType | true
    }

  export interface InstallationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Installation'], meta: { name: 'Installation' } }
    /**
     * Find zero or one Installation that matches the filter.
     * @param {InstallationFindUniqueArgs} args - Arguments to find a Installation
     * @example
     * // Get one Installation
     * const installation = await prisma.installation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InstallationFindUniqueArgs>(args: SelectSubset<T, InstallationFindUniqueArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Installation that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InstallationFindUniqueOrThrowArgs} args - Arguments to find a Installation
     * @example
     * // Get one Installation
     * const installation = await prisma.installation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InstallationFindUniqueOrThrowArgs>(args: SelectSubset<T, InstallationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Installation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallationFindFirstArgs} args - Arguments to find a Installation
     * @example
     * // Get one Installation
     * const installation = await prisma.installation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InstallationFindFirstArgs>(args?: SelectSubset<T, InstallationFindFirstArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Installation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallationFindFirstOrThrowArgs} args - Arguments to find a Installation
     * @example
     * // Get one Installation
     * const installation = await prisma.installation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InstallationFindFirstOrThrowArgs>(args?: SelectSubset<T, InstallationFindFirstOrThrowArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Installations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Installations
     * const installations = await prisma.installation.findMany()
     * 
     * // Get first 10 Installations
     * const installations = await prisma.installation.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const installationWithIdOnly = await prisma.installation.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InstallationFindManyArgs>(args?: SelectSubset<T, InstallationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Installation.
     * @param {InstallationCreateArgs} args - Arguments to create a Installation.
     * @example
     * // Create one Installation
     * const Installation = await prisma.installation.create({
     *   data: {
     *     // ... data to create a Installation
     *   }
     * })
     * 
     */
    create<T extends InstallationCreateArgs>(args: SelectSubset<T, InstallationCreateArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Installations.
     * @param {InstallationCreateManyArgs} args - Arguments to create many Installations.
     * @example
     * // Create many Installations
     * const installation = await prisma.installation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InstallationCreateManyArgs>(args?: SelectSubset<T, InstallationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Installations and returns the data saved in the database.
     * @param {InstallationCreateManyAndReturnArgs} args - Arguments to create many Installations.
     * @example
     * // Create many Installations
     * const installation = await prisma.installation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Installations and only return the `id`
     * const installationWithIdOnly = await prisma.installation.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InstallationCreateManyAndReturnArgs>(args?: SelectSubset<T, InstallationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Installation.
     * @param {InstallationDeleteArgs} args - Arguments to delete one Installation.
     * @example
     * // Delete one Installation
     * const Installation = await prisma.installation.delete({
     *   where: {
     *     // ... filter to delete one Installation
     *   }
     * })
     * 
     */
    delete<T extends InstallationDeleteArgs>(args: SelectSubset<T, InstallationDeleteArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Installation.
     * @param {InstallationUpdateArgs} args - Arguments to update one Installation.
     * @example
     * // Update one Installation
     * const installation = await prisma.installation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InstallationUpdateArgs>(args: SelectSubset<T, InstallationUpdateArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Installations.
     * @param {InstallationDeleteManyArgs} args - Arguments to filter Installations to delete.
     * @example
     * // Delete a few Installations
     * const { count } = await prisma.installation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InstallationDeleteManyArgs>(args?: SelectSubset<T, InstallationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Installations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Installations
     * const installation = await prisma.installation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InstallationUpdateManyArgs>(args: SelectSubset<T, InstallationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Installations and returns the data updated in the database.
     * @param {InstallationUpdateManyAndReturnArgs} args - Arguments to update many Installations.
     * @example
     * // Update many Installations
     * const installation = await prisma.installation.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Installations and only return the `id`
     * const installationWithIdOnly = await prisma.installation.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InstallationUpdateManyAndReturnArgs>(args: SelectSubset<T, InstallationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Installation.
     * @param {InstallationUpsertArgs} args - Arguments to update or create a Installation.
     * @example
     * // Update or create a Installation
     * const installation = await prisma.installation.upsert({
     *   create: {
     *     // ... data to create a Installation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Installation we want to update
     *   }
     * })
     */
    upsert<T extends InstallationUpsertArgs>(args: SelectSubset<T, InstallationUpsertArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Installations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallationCountArgs} args - Arguments to filter Installations to count.
     * @example
     * // Count the number of Installations
     * const count = await prisma.installation.count({
     *   where: {
     *     // ... the filter for the Installations we want to count
     *   }
     * })
    **/
    count<T extends InstallationCountArgs>(
      args?: Subset<T, InstallationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InstallationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Installation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InstallationAggregateArgs>(args: Subset<T, InstallationAggregateArgs>): Prisma.PrismaPromise<GetInstallationAggregateType<T>>

    /**
     * Group by Installation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InstallationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InstallationGroupByArgs['orderBy'] }
        : { orderBy?: InstallationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InstallationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInstallationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Installation model
   */
  readonly fields: InstallationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Installation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InstallationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    subscriptionPackage<T extends Installation$subscriptionPackageArgs<ExtArgs> = {}>(args?: Subset<T, Installation$subscriptionPackageArgs<ExtArgs>>): Prisma__SubscriptionPackageClient<$Result.GetResult<Prisma.$SubscriptionPackagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    tasks<T extends Installation$tasksArgs<ExtArgs> = {}>(args?: Subset<T, Installation$tasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    users<T extends Installation$usersArgs<ExtArgs> = {}>(args?: Subset<T, Installation$usersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    userInstallationPermissions<T extends Installation$userInstallationPermissionsArgs<ExtArgs> = {}>(args?: Subset<T, Installation$userInstallationPermissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    transactions<T extends Installation$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Installation$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    taskSubmissions<T extends Installation$taskSubmissionsArgs<ExtArgs> = {}>(args?: Subset<T, Installation$taskSubmissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Installation model
   */
  interface InstallationFieldRefs {
    readonly id: FieldRef<"Installation", 'String'>
    readonly htmlUrl: FieldRef<"Installation", 'String'>
    readonly targetId: FieldRef<"Installation", 'Int'>
    readonly targetType: FieldRef<"Installation", 'String'>
    readonly account: FieldRef<"Installation", 'Json'>
    readonly walletAddress: FieldRef<"Installation", 'String'>
    readonly walletSecret: FieldRef<"Installation", 'String'>
    readonly escrowAddress: FieldRef<"Installation", 'String'>
    readonly escrowSecret: FieldRef<"Installation", 'String'>
    readonly subscriptionPackageId: FieldRef<"Installation", 'String'>
    readonly createdAt: FieldRef<"Installation", 'DateTime'>
    readonly updatedAt: FieldRef<"Installation", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Installation findUnique
   */
  export type InstallationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * Filter, which Installation to fetch.
     */
    where: InstallationWhereUniqueInput
  }

  /**
   * Installation findUniqueOrThrow
   */
  export type InstallationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * Filter, which Installation to fetch.
     */
    where: InstallationWhereUniqueInput
  }

  /**
   * Installation findFirst
   */
  export type InstallationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * Filter, which Installation to fetch.
     */
    where?: InstallationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installations to fetch.
     */
    orderBy?: InstallationOrderByWithRelationInput | InstallationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Installations.
     */
    cursor?: InstallationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Installations.
     */
    distinct?: InstallationScalarFieldEnum | InstallationScalarFieldEnum[]
  }

  /**
   * Installation findFirstOrThrow
   */
  export type InstallationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * Filter, which Installation to fetch.
     */
    where?: InstallationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installations to fetch.
     */
    orderBy?: InstallationOrderByWithRelationInput | InstallationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Installations.
     */
    cursor?: InstallationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Installations.
     */
    distinct?: InstallationScalarFieldEnum | InstallationScalarFieldEnum[]
  }

  /**
   * Installation findMany
   */
  export type InstallationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * Filter, which Installations to fetch.
     */
    where?: InstallationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installations to fetch.
     */
    orderBy?: InstallationOrderByWithRelationInput | InstallationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Installations.
     */
    cursor?: InstallationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installations.
     */
    skip?: number
    distinct?: InstallationScalarFieldEnum | InstallationScalarFieldEnum[]
  }

  /**
   * Installation create
   */
  export type InstallationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * The data needed to create a Installation.
     */
    data: XOR<InstallationCreateInput, InstallationUncheckedCreateInput>
  }

  /**
   * Installation createMany
   */
  export type InstallationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Installations.
     */
    data: InstallationCreateManyInput | InstallationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Installation createManyAndReturn
   */
  export type InstallationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * The data used to create many Installations.
     */
    data: InstallationCreateManyInput | InstallationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Installation update
   */
  export type InstallationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * The data needed to update a Installation.
     */
    data: XOR<InstallationUpdateInput, InstallationUncheckedUpdateInput>
    /**
     * Choose, which Installation to update.
     */
    where: InstallationWhereUniqueInput
  }

  /**
   * Installation updateMany
   */
  export type InstallationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Installations.
     */
    data: XOR<InstallationUpdateManyMutationInput, InstallationUncheckedUpdateManyInput>
    /**
     * Filter which Installations to update
     */
    where?: InstallationWhereInput
    /**
     * Limit how many Installations to update.
     */
    limit?: number
  }

  /**
   * Installation updateManyAndReturn
   */
  export type InstallationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * The data used to update Installations.
     */
    data: XOR<InstallationUpdateManyMutationInput, InstallationUncheckedUpdateManyInput>
    /**
     * Filter which Installations to update
     */
    where?: InstallationWhereInput
    /**
     * Limit how many Installations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Installation upsert
   */
  export type InstallationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * The filter to search for the Installation to update in case it exists.
     */
    where: InstallationWhereUniqueInput
    /**
     * In case the Installation found by the `where` argument doesn't exist, create a new Installation with this data.
     */
    create: XOR<InstallationCreateInput, InstallationUncheckedCreateInput>
    /**
     * In case the Installation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InstallationUpdateInput, InstallationUncheckedUpdateInput>
  }

  /**
   * Installation delete
   */
  export type InstallationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    /**
     * Filter which Installation to delete.
     */
    where: InstallationWhereUniqueInput
  }

  /**
   * Installation deleteMany
   */
  export type InstallationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Installations to delete
     */
    where?: InstallationWhereInput
    /**
     * Limit how many Installations to delete.
     */
    limit?: number
  }

  /**
   * Installation.subscriptionPackage
   */
  export type Installation$subscriptionPackageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionPackage
     */
    select?: SubscriptionPackageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubscriptionPackage
     */
    omit?: SubscriptionPackageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionPackageInclude<ExtArgs> | null
    where?: SubscriptionPackageWhereInput
  }

  /**
   * Installation.tasks
   */
  export type Installation$tasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Installation.users
   */
  export type Installation$usersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    cursor?: UserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * Installation.userInstallationPermissions
   */
  export type Installation$userInstallationPermissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    where?: UserInstallationPermissionWhereInput
    orderBy?: UserInstallationPermissionOrderByWithRelationInput | UserInstallationPermissionOrderByWithRelationInput[]
    cursor?: UserInstallationPermissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserInstallationPermissionScalarFieldEnum | UserInstallationPermissionScalarFieldEnum[]
  }

  /**
   * Installation.transactions
   */
  export type Installation$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Installation.taskSubmissions
   */
  export type Installation$taskSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    where?: TaskSubmissionWhereInput
    orderBy?: TaskSubmissionOrderByWithRelationInput | TaskSubmissionOrderByWithRelationInput[]
    cursor?: TaskSubmissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskSubmissionScalarFieldEnum | TaskSubmissionScalarFieldEnum[]
  }

  /**
   * Installation without action
   */
  export type InstallationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
  }


  /**
   * Model Task
   */

  export type AggregateTask = {
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  export type TaskAvgAggregateOutputType = {
    timeline: number | null
    bounty: number | null
  }

  export type TaskSumAggregateOutputType = {
    timeline: number | null
    bounty: number | null
  }

  export type TaskMinAggregateOutputType = {
    id: string | null
    timeline: number | null
    timelineType: $Enums.TimelineType | null
    bounty: number | null
    status: $Enums.TaskStatus | null
    settled: boolean | null
    acceptedAt: Date | null
    completedAt: Date | null
    creatorId: string | null
    contributorId: string | null
    installationId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskMaxAggregateOutputType = {
    id: string | null
    timeline: number | null
    timelineType: $Enums.TimelineType | null
    bounty: number | null
    status: $Enums.TaskStatus | null
    settled: boolean | null
    acceptedAt: Date | null
    completedAt: Date | null
    creatorId: string | null
    contributorId: string | null
    installationId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskCountAggregateOutputType = {
    id: number
    issue: number
    timeline: number
    timelineType: number
    bounty: number
    status: number
    settled: number
    acceptedAt: number
    completedAt: number
    creatorId: number
    contributorId: number
    installationId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TaskAvgAggregateInputType = {
    timeline?: true
    bounty?: true
  }

  export type TaskSumAggregateInputType = {
    timeline?: true
    bounty?: true
  }

  export type TaskMinAggregateInputType = {
    id?: true
    timeline?: true
    timelineType?: true
    bounty?: true
    status?: true
    settled?: true
    acceptedAt?: true
    completedAt?: true
    creatorId?: true
    contributorId?: true
    installationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskMaxAggregateInputType = {
    id?: true
    timeline?: true
    timelineType?: true
    bounty?: true
    status?: true
    settled?: true
    acceptedAt?: true
    completedAt?: true
    creatorId?: true
    contributorId?: true
    installationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskCountAggregateInputType = {
    id?: true
    issue?: true
    timeline?: true
    timelineType?: true
    bounty?: true
    status?: true
    settled?: true
    acceptedAt?: true
    completedAt?: true
    creatorId?: true
    contributorId?: true
    installationId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TaskAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Task to aggregate.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tasks
    **/
    _count?: true | TaskCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TaskAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TaskSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskMaxAggregateInputType
  }

  export type GetTaskAggregateType<T extends TaskAggregateArgs> = {
        [P in keyof T & keyof AggregateTask]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTask[P]>
      : GetScalarType<T[P], AggregateTask[P]>
  }




  export type TaskGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithAggregationInput | TaskOrderByWithAggregationInput[]
    by: TaskScalarFieldEnum[] | TaskScalarFieldEnum
    having?: TaskScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskCountAggregateInputType | true
    _avg?: TaskAvgAggregateInputType
    _sum?: TaskSumAggregateInputType
    _min?: TaskMinAggregateInputType
    _max?: TaskMaxAggregateInputType
  }

  export type TaskGroupByOutputType = {
    id: string
    issue: JsonValue
    timeline: number | null
    timelineType: $Enums.TimelineType | null
    bounty: number
    status: $Enums.TaskStatus
    settled: boolean
    acceptedAt: Date | null
    completedAt: Date | null
    creatorId: string
    contributorId: string | null
    installationId: string
    createdAt: Date
    updatedAt: Date
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  type GetTaskGroupByPayload<T extends TaskGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskGroupByOutputType[P]>
            : GetScalarType<T[P], TaskGroupByOutputType[P]>
        }
      >
    >


  export type TaskSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    issue?: boolean
    timeline?: boolean
    timelineType?: boolean
    bounty?: boolean
    status?: boolean
    settled?: boolean
    acceptedAt?: boolean
    completedAt?: boolean
    creatorId?: boolean
    contributorId?: boolean
    installationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    applications?: boolean | Task$applicationsArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
    contributor?: boolean | Task$contributorArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
    transactions?: boolean | Task$transactionsArgs<ExtArgs>
    taskSubmissions?: boolean | Task$taskSubmissionsArgs<ExtArgs>
    taskActivities?: boolean | Task$taskActivitiesArgs<ExtArgs>
    _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    issue?: boolean
    timeline?: boolean
    timelineType?: boolean
    bounty?: boolean
    status?: boolean
    settled?: boolean
    acceptedAt?: boolean
    completedAt?: boolean
    creatorId?: boolean
    contributorId?: boolean
    installationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    creator?: boolean | UserDefaultArgs<ExtArgs>
    contributor?: boolean | Task$contributorArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    issue?: boolean
    timeline?: boolean
    timelineType?: boolean
    bounty?: boolean
    status?: boolean
    settled?: boolean
    acceptedAt?: boolean
    completedAt?: boolean
    creatorId?: boolean
    contributorId?: boolean
    installationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    creator?: boolean | UserDefaultArgs<ExtArgs>
    contributor?: boolean | Task$contributorArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectScalar = {
    id?: boolean
    issue?: boolean
    timeline?: boolean
    timelineType?: boolean
    bounty?: boolean
    status?: boolean
    settled?: boolean
    acceptedAt?: boolean
    completedAt?: boolean
    creatorId?: boolean
    contributorId?: boolean
    installationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TaskOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "issue" | "timeline" | "timelineType" | "bounty" | "status" | "settled" | "acceptedAt" | "completedAt" | "creatorId" | "contributorId" | "installationId" | "createdAt" | "updatedAt", ExtArgs["result"]["task"]>
  export type TaskInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    applications?: boolean | Task$applicationsArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
    contributor?: boolean | Task$contributorArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
    transactions?: boolean | Task$transactionsArgs<ExtArgs>
    taskSubmissions?: boolean | Task$taskSubmissionsArgs<ExtArgs>
    taskActivities?: boolean | Task$taskActivitiesArgs<ExtArgs>
    _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TaskIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creator?: boolean | UserDefaultArgs<ExtArgs>
    contributor?: boolean | Task$contributorArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }
  export type TaskIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creator?: boolean | UserDefaultArgs<ExtArgs>
    contributor?: boolean | Task$contributorArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }

  export type $TaskPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Task"
    objects: {
      applications: Prisma.$UserPayload<ExtArgs>[]
      creator: Prisma.$UserPayload<ExtArgs>
      contributor: Prisma.$UserPayload<ExtArgs> | null
      installation: Prisma.$InstallationPayload<ExtArgs>
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      taskSubmissions: Prisma.$TaskSubmissionPayload<ExtArgs>[]
      taskActivities: Prisma.$TaskActivityPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      issue: Prisma.JsonValue
      timeline: number | null
      timelineType: $Enums.TimelineType | null
      bounty: number
      status: $Enums.TaskStatus
      settled: boolean
      acceptedAt: Date | null
      completedAt: Date | null
      creatorId: string
      contributorId: string | null
      installationId: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["task"]>
    composites: {}
  }

  type TaskGetPayload<S extends boolean | null | undefined | TaskDefaultArgs> = $Result.GetResult<Prisma.$TaskPayload, S>

  type TaskCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskCountAggregateInputType | true
    }

  export interface TaskDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Task'], meta: { name: 'Task' } }
    /**
     * Find zero or one Task that matches the filter.
     * @param {TaskFindUniqueArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskFindUniqueArgs>(args: SelectSubset<T, TaskFindUniqueArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Task that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskFindUniqueOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskFindFirstArgs>(args?: SelectSubset<T, TaskFindFirstArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tasks
     * const tasks = await prisma.task.findMany()
     * 
     * // Get first 10 Tasks
     * const tasks = await prisma.task.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskWithIdOnly = await prisma.task.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskFindManyArgs>(args?: SelectSubset<T, TaskFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Task.
     * @param {TaskCreateArgs} args - Arguments to create a Task.
     * @example
     * // Create one Task
     * const Task = await prisma.task.create({
     *   data: {
     *     // ... data to create a Task
     *   }
     * })
     * 
     */
    create<T extends TaskCreateArgs>(args: SelectSubset<T, TaskCreateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tasks.
     * @param {TaskCreateManyArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskCreateManyArgs>(args?: SelectSubset<T, TaskCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tasks and returns the data saved in the database.
     * @param {TaskCreateManyAndReturnArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Task.
     * @param {TaskDeleteArgs} args - Arguments to delete one Task.
     * @example
     * // Delete one Task
     * const Task = await prisma.task.delete({
     *   where: {
     *     // ... filter to delete one Task
     *   }
     * })
     * 
     */
    delete<T extends TaskDeleteArgs>(args: SelectSubset<T, TaskDeleteArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Task.
     * @param {TaskUpdateArgs} args - Arguments to update one Task.
     * @example
     * // Update one Task
     * const task = await prisma.task.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskUpdateArgs>(args: SelectSubset<T, TaskUpdateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tasks.
     * @param {TaskDeleteManyArgs} args - Arguments to filter Tasks to delete.
     * @example
     * // Delete a few Tasks
     * const { count } = await prisma.task.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskDeleteManyArgs>(args?: SelectSubset<T, TaskDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskUpdateManyArgs>(args: SelectSubset<T, TaskUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks and returns the data updated in the database.
     * @param {TaskUpdateManyAndReturnArgs} args - Arguments to update many Tasks.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Task.
     * @param {TaskUpsertArgs} args - Arguments to update or create a Task.
     * @example
     * // Update or create a Task
     * const task = await prisma.task.upsert({
     *   create: {
     *     // ... data to create a Task
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Task we want to update
     *   }
     * })
     */
    upsert<T extends TaskUpsertArgs>(args: SelectSubset<T, TaskUpsertArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCountArgs} args - Arguments to filter Tasks to count.
     * @example
     * // Count the number of Tasks
     * const count = await prisma.task.count({
     *   where: {
     *     // ... the filter for the Tasks we want to count
     *   }
     * })
    **/
    count<T extends TaskCountArgs>(
      args?: Subset<T, TaskCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskAggregateArgs>(args: Subset<T, TaskAggregateArgs>): Prisma.PrismaPromise<GetTaskAggregateType<T>>

    /**
     * Group by Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskGroupByArgs['orderBy'] }
        : { orderBy?: TaskGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Task model
   */
  readonly fields: TaskFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Task.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    applications<T extends Task$applicationsArgs<ExtArgs> = {}>(args?: Subset<T, Task$applicationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    creator<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    contributor<T extends Task$contributorArgs<ExtArgs> = {}>(args?: Subset<T, Task$contributorArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    installation<T extends InstallationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstallationDefaultArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Task$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Task$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    taskSubmissions<T extends Task$taskSubmissionsArgs<ExtArgs> = {}>(args?: Subset<T, Task$taskSubmissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    taskActivities<T extends Task$taskActivitiesArgs<ExtArgs> = {}>(args?: Subset<T, Task$taskActivitiesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Task model
   */
  interface TaskFieldRefs {
    readonly id: FieldRef<"Task", 'String'>
    readonly issue: FieldRef<"Task", 'Json'>
    readonly timeline: FieldRef<"Task", 'Float'>
    readonly timelineType: FieldRef<"Task", 'TimelineType'>
    readonly bounty: FieldRef<"Task", 'Float'>
    readonly status: FieldRef<"Task", 'TaskStatus'>
    readonly settled: FieldRef<"Task", 'Boolean'>
    readonly acceptedAt: FieldRef<"Task", 'DateTime'>
    readonly completedAt: FieldRef<"Task", 'DateTime'>
    readonly creatorId: FieldRef<"Task", 'String'>
    readonly contributorId: FieldRef<"Task", 'String'>
    readonly installationId: FieldRef<"Task", 'String'>
    readonly createdAt: FieldRef<"Task", 'DateTime'>
    readonly updatedAt: FieldRef<"Task", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Task findUnique
   */
  export type TaskFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findUniqueOrThrow
   */
  export type TaskFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findFirst
   */
  export type TaskFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findFirstOrThrow
   */
  export type TaskFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findMany
   */
  export type TaskFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Tasks to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task create
   */
  export type TaskCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to create a Task.
     */
    data: XOR<TaskCreateInput, TaskUncheckedCreateInput>
  }

  /**
   * Task createMany
   */
  export type TaskCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Task createManyAndReturn
   */
  export type TaskCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Task update
   */
  export type TaskUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to update a Task.
     */
    data: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
    /**
     * Choose, which Task to update.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task updateMany
   */
  export type TaskUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
  }

  /**
   * Task updateManyAndReturn
   */
  export type TaskUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Task upsert
   */
  export type TaskUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The filter to search for the Task to update in case it exists.
     */
    where: TaskWhereUniqueInput
    /**
     * In case the Task found by the `where` argument doesn't exist, create a new Task with this data.
     */
    create: XOR<TaskCreateInput, TaskUncheckedCreateInput>
    /**
     * In case the Task was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
  }

  /**
   * Task delete
   */
  export type TaskDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter which Task to delete.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task deleteMany
   */
  export type TaskDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tasks to delete
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to delete.
     */
    limit?: number
  }

  /**
   * Task.applications
   */
  export type Task$applicationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    cursor?: UserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * Task.contributor
   */
  export type Task$contributorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Task.transactions
   */
  export type Task$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Task.taskSubmissions
   */
  export type Task$taskSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    where?: TaskSubmissionWhereInput
    orderBy?: TaskSubmissionOrderByWithRelationInput | TaskSubmissionOrderByWithRelationInput[]
    cursor?: TaskSubmissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskSubmissionScalarFieldEnum | TaskSubmissionScalarFieldEnum[]
  }

  /**
   * Task.taskActivities
   */
  export type Task$taskActivitiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    where?: TaskActivityWhereInput
    orderBy?: TaskActivityOrderByWithRelationInput | TaskActivityOrderByWithRelationInput[]
    cursor?: TaskActivityWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskActivityScalarFieldEnum | TaskActivityScalarFieldEnum[]
  }

  /**
   * Task without action
   */
  export type TaskDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
  }


  /**
   * Model TaskSubmission
   */

  export type AggregateTaskSubmission = {
    _count: TaskSubmissionCountAggregateOutputType | null
    _min: TaskSubmissionMinAggregateOutputType | null
    _max: TaskSubmissionMaxAggregateOutputType | null
  }

  export type TaskSubmissionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    taskId: string | null
    installationId: string | null
    pullRequest: string | null
    attachmentUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskSubmissionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    taskId: string | null
    installationId: string | null
    pullRequest: string | null
    attachmentUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskSubmissionCountAggregateOutputType = {
    id: number
    userId: number
    taskId: number
    installationId: number
    pullRequest: number
    attachmentUrl: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TaskSubmissionMinAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    installationId?: true
    pullRequest?: true
    attachmentUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskSubmissionMaxAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    installationId?: true
    pullRequest?: true
    attachmentUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskSubmissionCountAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    installationId?: true
    pullRequest?: true
    attachmentUrl?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TaskSubmissionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskSubmission to aggregate.
     */
    where?: TaskSubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskSubmissions to fetch.
     */
    orderBy?: TaskSubmissionOrderByWithRelationInput | TaskSubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskSubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskSubmissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskSubmissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TaskSubmissions
    **/
    _count?: true | TaskSubmissionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskSubmissionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskSubmissionMaxAggregateInputType
  }

  export type GetTaskSubmissionAggregateType<T extends TaskSubmissionAggregateArgs> = {
        [P in keyof T & keyof AggregateTaskSubmission]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTaskSubmission[P]>
      : GetScalarType<T[P], AggregateTaskSubmission[P]>
  }




  export type TaskSubmissionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskSubmissionWhereInput
    orderBy?: TaskSubmissionOrderByWithAggregationInput | TaskSubmissionOrderByWithAggregationInput[]
    by: TaskSubmissionScalarFieldEnum[] | TaskSubmissionScalarFieldEnum
    having?: TaskSubmissionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskSubmissionCountAggregateInputType | true
    _min?: TaskSubmissionMinAggregateInputType
    _max?: TaskSubmissionMaxAggregateInputType
  }

  export type TaskSubmissionGroupByOutputType = {
    id: string
    userId: string
    taskId: string
    installationId: string
    pullRequest: string
    attachmentUrl: string | null
    createdAt: Date
    updatedAt: Date
    _count: TaskSubmissionCountAggregateOutputType | null
    _min: TaskSubmissionMinAggregateOutputType | null
    _max: TaskSubmissionMaxAggregateOutputType | null
  }

  type GetTaskSubmissionGroupByPayload<T extends TaskSubmissionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskSubmissionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskSubmissionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskSubmissionGroupByOutputType[P]>
            : GetScalarType<T[P], TaskSubmissionGroupByOutputType[P]>
        }
      >
    >


  export type TaskSubmissionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    taskId?: boolean
    installationId?: boolean
    pullRequest?: boolean
    attachmentUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    task?: boolean | TaskDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
    taskActivities?: boolean | TaskSubmission$taskActivitiesArgs<ExtArgs>
    _count?: boolean | TaskSubmissionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskSubmission"]>

  export type TaskSubmissionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    taskId?: boolean
    installationId?: boolean
    pullRequest?: boolean
    attachmentUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    task?: boolean | TaskDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskSubmission"]>

  export type TaskSubmissionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    taskId?: boolean
    installationId?: boolean
    pullRequest?: boolean
    attachmentUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    task?: boolean | TaskDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskSubmission"]>

  export type TaskSubmissionSelectScalar = {
    id?: boolean
    userId?: boolean
    taskId?: boolean
    installationId?: boolean
    pullRequest?: boolean
    attachmentUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TaskSubmissionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "taskId" | "installationId" | "pullRequest" | "attachmentUrl" | "createdAt" | "updatedAt", ExtArgs["result"]["taskSubmission"]>
  export type TaskSubmissionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    task?: boolean | TaskDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
    taskActivities?: boolean | TaskSubmission$taskActivitiesArgs<ExtArgs>
    _count?: boolean | TaskSubmissionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TaskSubmissionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    task?: boolean | TaskDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }
  export type TaskSubmissionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    task?: boolean | TaskDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }

  export type $TaskSubmissionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TaskSubmission"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      task: Prisma.$TaskPayload<ExtArgs>
      installation: Prisma.$InstallationPayload<ExtArgs>
      taskActivities: Prisma.$TaskActivityPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      taskId: string
      installationId: string
      pullRequest: string
      attachmentUrl: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["taskSubmission"]>
    composites: {}
  }

  type TaskSubmissionGetPayload<S extends boolean | null | undefined | TaskSubmissionDefaultArgs> = $Result.GetResult<Prisma.$TaskSubmissionPayload, S>

  type TaskSubmissionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskSubmissionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskSubmissionCountAggregateInputType | true
    }

  export interface TaskSubmissionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TaskSubmission'], meta: { name: 'TaskSubmission' } }
    /**
     * Find zero or one TaskSubmission that matches the filter.
     * @param {TaskSubmissionFindUniqueArgs} args - Arguments to find a TaskSubmission
     * @example
     * // Get one TaskSubmission
     * const taskSubmission = await prisma.taskSubmission.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskSubmissionFindUniqueArgs>(args: SelectSubset<T, TaskSubmissionFindUniqueArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TaskSubmission that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskSubmissionFindUniqueOrThrowArgs} args - Arguments to find a TaskSubmission
     * @example
     * // Get one TaskSubmission
     * const taskSubmission = await prisma.taskSubmission.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskSubmissionFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskSubmissionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskSubmission that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskSubmissionFindFirstArgs} args - Arguments to find a TaskSubmission
     * @example
     * // Get one TaskSubmission
     * const taskSubmission = await prisma.taskSubmission.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskSubmissionFindFirstArgs>(args?: SelectSubset<T, TaskSubmissionFindFirstArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskSubmission that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskSubmissionFindFirstOrThrowArgs} args - Arguments to find a TaskSubmission
     * @example
     * // Get one TaskSubmission
     * const taskSubmission = await prisma.taskSubmission.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskSubmissionFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskSubmissionFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TaskSubmissions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskSubmissionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TaskSubmissions
     * const taskSubmissions = await prisma.taskSubmission.findMany()
     * 
     * // Get first 10 TaskSubmissions
     * const taskSubmissions = await prisma.taskSubmission.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskSubmissionWithIdOnly = await prisma.taskSubmission.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskSubmissionFindManyArgs>(args?: SelectSubset<T, TaskSubmissionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TaskSubmission.
     * @param {TaskSubmissionCreateArgs} args - Arguments to create a TaskSubmission.
     * @example
     * // Create one TaskSubmission
     * const TaskSubmission = await prisma.taskSubmission.create({
     *   data: {
     *     // ... data to create a TaskSubmission
     *   }
     * })
     * 
     */
    create<T extends TaskSubmissionCreateArgs>(args: SelectSubset<T, TaskSubmissionCreateArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TaskSubmissions.
     * @param {TaskSubmissionCreateManyArgs} args - Arguments to create many TaskSubmissions.
     * @example
     * // Create many TaskSubmissions
     * const taskSubmission = await prisma.taskSubmission.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskSubmissionCreateManyArgs>(args?: SelectSubset<T, TaskSubmissionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TaskSubmissions and returns the data saved in the database.
     * @param {TaskSubmissionCreateManyAndReturnArgs} args - Arguments to create many TaskSubmissions.
     * @example
     * // Create many TaskSubmissions
     * const taskSubmission = await prisma.taskSubmission.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TaskSubmissions and only return the `id`
     * const taskSubmissionWithIdOnly = await prisma.taskSubmission.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskSubmissionCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskSubmissionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TaskSubmission.
     * @param {TaskSubmissionDeleteArgs} args - Arguments to delete one TaskSubmission.
     * @example
     * // Delete one TaskSubmission
     * const TaskSubmission = await prisma.taskSubmission.delete({
     *   where: {
     *     // ... filter to delete one TaskSubmission
     *   }
     * })
     * 
     */
    delete<T extends TaskSubmissionDeleteArgs>(args: SelectSubset<T, TaskSubmissionDeleteArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TaskSubmission.
     * @param {TaskSubmissionUpdateArgs} args - Arguments to update one TaskSubmission.
     * @example
     * // Update one TaskSubmission
     * const taskSubmission = await prisma.taskSubmission.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskSubmissionUpdateArgs>(args: SelectSubset<T, TaskSubmissionUpdateArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TaskSubmissions.
     * @param {TaskSubmissionDeleteManyArgs} args - Arguments to filter TaskSubmissions to delete.
     * @example
     * // Delete a few TaskSubmissions
     * const { count } = await prisma.taskSubmission.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskSubmissionDeleteManyArgs>(args?: SelectSubset<T, TaskSubmissionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskSubmissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskSubmissionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TaskSubmissions
     * const taskSubmission = await prisma.taskSubmission.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskSubmissionUpdateManyArgs>(args: SelectSubset<T, TaskSubmissionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskSubmissions and returns the data updated in the database.
     * @param {TaskSubmissionUpdateManyAndReturnArgs} args - Arguments to update many TaskSubmissions.
     * @example
     * // Update many TaskSubmissions
     * const taskSubmission = await prisma.taskSubmission.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TaskSubmissions and only return the `id`
     * const taskSubmissionWithIdOnly = await prisma.taskSubmission.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskSubmissionUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskSubmissionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TaskSubmission.
     * @param {TaskSubmissionUpsertArgs} args - Arguments to update or create a TaskSubmission.
     * @example
     * // Update or create a TaskSubmission
     * const taskSubmission = await prisma.taskSubmission.upsert({
     *   create: {
     *     // ... data to create a TaskSubmission
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TaskSubmission we want to update
     *   }
     * })
     */
    upsert<T extends TaskSubmissionUpsertArgs>(args: SelectSubset<T, TaskSubmissionUpsertArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TaskSubmissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskSubmissionCountArgs} args - Arguments to filter TaskSubmissions to count.
     * @example
     * // Count the number of TaskSubmissions
     * const count = await prisma.taskSubmission.count({
     *   where: {
     *     // ... the filter for the TaskSubmissions we want to count
     *   }
     * })
    **/
    count<T extends TaskSubmissionCountArgs>(
      args?: Subset<T, TaskSubmissionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskSubmissionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TaskSubmission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskSubmissionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskSubmissionAggregateArgs>(args: Subset<T, TaskSubmissionAggregateArgs>): Prisma.PrismaPromise<GetTaskSubmissionAggregateType<T>>

    /**
     * Group by TaskSubmission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskSubmissionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskSubmissionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskSubmissionGroupByArgs['orderBy'] }
        : { orderBy?: TaskSubmissionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskSubmissionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskSubmissionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TaskSubmission model
   */
  readonly fields: TaskSubmissionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TaskSubmission.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskSubmissionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    task<T extends TaskDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TaskDefaultArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    installation<T extends InstallationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstallationDefaultArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    taskActivities<T extends TaskSubmission$taskActivitiesArgs<ExtArgs> = {}>(args?: Subset<T, TaskSubmission$taskActivitiesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TaskSubmission model
   */
  interface TaskSubmissionFieldRefs {
    readonly id: FieldRef<"TaskSubmission", 'String'>
    readonly userId: FieldRef<"TaskSubmission", 'String'>
    readonly taskId: FieldRef<"TaskSubmission", 'String'>
    readonly installationId: FieldRef<"TaskSubmission", 'String'>
    readonly pullRequest: FieldRef<"TaskSubmission", 'String'>
    readonly attachmentUrl: FieldRef<"TaskSubmission", 'String'>
    readonly createdAt: FieldRef<"TaskSubmission", 'DateTime'>
    readonly updatedAt: FieldRef<"TaskSubmission", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TaskSubmission findUnique
   */
  export type TaskSubmissionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * Filter, which TaskSubmission to fetch.
     */
    where: TaskSubmissionWhereUniqueInput
  }

  /**
   * TaskSubmission findUniqueOrThrow
   */
  export type TaskSubmissionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * Filter, which TaskSubmission to fetch.
     */
    where: TaskSubmissionWhereUniqueInput
  }

  /**
   * TaskSubmission findFirst
   */
  export type TaskSubmissionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * Filter, which TaskSubmission to fetch.
     */
    where?: TaskSubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskSubmissions to fetch.
     */
    orderBy?: TaskSubmissionOrderByWithRelationInput | TaskSubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskSubmissions.
     */
    cursor?: TaskSubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskSubmissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskSubmissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskSubmissions.
     */
    distinct?: TaskSubmissionScalarFieldEnum | TaskSubmissionScalarFieldEnum[]
  }

  /**
   * TaskSubmission findFirstOrThrow
   */
  export type TaskSubmissionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * Filter, which TaskSubmission to fetch.
     */
    where?: TaskSubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskSubmissions to fetch.
     */
    orderBy?: TaskSubmissionOrderByWithRelationInput | TaskSubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskSubmissions.
     */
    cursor?: TaskSubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskSubmissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskSubmissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskSubmissions.
     */
    distinct?: TaskSubmissionScalarFieldEnum | TaskSubmissionScalarFieldEnum[]
  }

  /**
   * TaskSubmission findMany
   */
  export type TaskSubmissionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * Filter, which TaskSubmissions to fetch.
     */
    where?: TaskSubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskSubmissions to fetch.
     */
    orderBy?: TaskSubmissionOrderByWithRelationInput | TaskSubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TaskSubmissions.
     */
    cursor?: TaskSubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskSubmissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskSubmissions.
     */
    skip?: number
    distinct?: TaskSubmissionScalarFieldEnum | TaskSubmissionScalarFieldEnum[]
  }

  /**
   * TaskSubmission create
   */
  export type TaskSubmissionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * The data needed to create a TaskSubmission.
     */
    data: XOR<TaskSubmissionCreateInput, TaskSubmissionUncheckedCreateInput>
  }

  /**
   * TaskSubmission createMany
   */
  export type TaskSubmissionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TaskSubmissions.
     */
    data: TaskSubmissionCreateManyInput | TaskSubmissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TaskSubmission createManyAndReturn
   */
  export type TaskSubmissionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * The data used to create many TaskSubmissions.
     */
    data: TaskSubmissionCreateManyInput | TaskSubmissionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TaskSubmission update
   */
  export type TaskSubmissionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * The data needed to update a TaskSubmission.
     */
    data: XOR<TaskSubmissionUpdateInput, TaskSubmissionUncheckedUpdateInput>
    /**
     * Choose, which TaskSubmission to update.
     */
    where: TaskSubmissionWhereUniqueInput
  }

  /**
   * TaskSubmission updateMany
   */
  export type TaskSubmissionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TaskSubmissions.
     */
    data: XOR<TaskSubmissionUpdateManyMutationInput, TaskSubmissionUncheckedUpdateManyInput>
    /**
     * Filter which TaskSubmissions to update
     */
    where?: TaskSubmissionWhereInput
    /**
     * Limit how many TaskSubmissions to update.
     */
    limit?: number
  }

  /**
   * TaskSubmission updateManyAndReturn
   */
  export type TaskSubmissionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * The data used to update TaskSubmissions.
     */
    data: XOR<TaskSubmissionUpdateManyMutationInput, TaskSubmissionUncheckedUpdateManyInput>
    /**
     * Filter which TaskSubmissions to update
     */
    where?: TaskSubmissionWhereInput
    /**
     * Limit how many TaskSubmissions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TaskSubmission upsert
   */
  export type TaskSubmissionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * The filter to search for the TaskSubmission to update in case it exists.
     */
    where: TaskSubmissionWhereUniqueInput
    /**
     * In case the TaskSubmission found by the `where` argument doesn't exist, create a new TaskSubmission with this data.
     */
    create: XOR<TaskSubmissionCreateInput, TaskSubmissionUncheckedCreateInput>
    /**
     * In case the TaskSubmission was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskSubmissionUpdateInput, TaskSubmissionUncheckedUpdateInput>
  }

  /**
   * TaskSubmission delete
   */
  export type TaskSubmissionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    /**
     * Filter which TaskSubmission to delete.
     */
    where: TaskSubmissionWhereUniqueInput
  }

  /**
   * TaskSubmission deleteMany
   */
  export type TaskSubmissionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskSubmissions to delete
     */
    where?: TaskSubmissionWhereInput
    /**
     * Limit how many TaskSubmissions to delete.
     */
    limit?: number
  }

  /**
   * TaskSubmission.taskActivities
   */
  export type TaskSubmission$taskActivitiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    where?: TaskActivityWhereInput
    orderBy?: TaskActivityOrderByWithRelationInput | TaskActivityOrderByWithRelationInput[]
    cursor?: TaskActivityWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskActivityScalarFieldEnum | TaskActivityScalarFieldEnum[]
  }

  /**
   * TaskSubmission without action
   */
  export type TaskSubmissionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
  }


  /**
   * Model TaskActivity
   */

  export type AggregateTaskActivity = {
    _count: TaskActivityCountAggregateOutputType | null
    _min: TaskActivityMinAggregateOutputType | null
    _max: TaskActivityMaxAggregateOutputType | null
  }

  export type TaskActivityMinAggregateOutputType = {
    id: string | null
    taskId: string | null
    userId: string | null
    taskSubmissionId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskActivityMaxAggregateOutputType = {
    id: string | null
    taskId: string | null
    userId: string | null
    taskSubmissionId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskActivityCountAggregateOutputType = {
    id: number
    taskId: number
    userId: number
    taskSubmissionId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TaskActivityMinAggregateInputType = {
    id?: true
    taskId?: true
    userId?: true
    taskSubmissionId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskActivityMaxAggregateInputType = {
    id?: true
    taskId?: true
    userId?: true
    taskSubmissionId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskActivityCountAggregateInputType = {
    id?: true
    taskId?: true
    userId?: true
    taskSubmissionId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TaskActivityAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskActivity to aggregate.
     */
    where?: TaskActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskActivities to fetch.
     */
    orderBy?: TaskActivityOrderByWithRelationInput | TaskActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskActivities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TaskActivities
    **/
    _count?: true | TaskActivityCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskActivityMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskActivityMaxAggregateInputType
  }

  export type GetTaskActivityAggregateType<T extends TaskActivityAggregateArgs> = {
        [P in keyof T & keyof AggregateTaskActivity]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTaskActivity[P]>
      : GetScalarType<T[P], AggregateTaskActivity[P]>
  }




  export type TaskActivityGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskActivityWhereInput
    orderBy?: TaskActivityOrderByWithAggregationInput | TaskActivityOrderByWithAggregationInput[]
    by: TaskActivityScalarFieldEnum[] | TaskActivityScalarFieldEnum
    having?: TaskActivityScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskActivityCountAggregateInputType | true
    _min?: TaskActivityMinAggregateInputType
    _max?: TaskActivityMaxAggregateInputType
  }

  export type TaskActivityGroupByOutputType = {
    id: string
    taskId: string
    userId: string | null
    taskSubmissionId: string | null
    createdAt: Date
    updatedAt: Date
    _count: TaskActivityCountAggregateOutputType | null
    _min: TaskActivityMinAggregateOutputType | null
    _max: TaskActivityMaxAggregateOutputType | null
  }

  type GetTaskActivityGroupByPayload<T extends TaskActivityGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskActivityGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskActivityGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskActivityGroupByOutputType[P]>
            : GetScalarType<T[P], TaskActivityGroupByOutputType[P]>
        }
      >
    >


  export type TaskActivitySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    userId?: boolean
    taskSubmissionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
    user?: boolean | TaskActivity$userArgs<ExtArgs>
    taskSubmission?: boolean | TaskActivity$taskSubmissionArgs<ExtArgs>
  }, ExtArgs["result"]["taskActivity"]>

  export type TaskActivitySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    userId?: boolean
    taskSubmissionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
    user?: boolean | TaskActivity$userArgs<ExtArgs>
    taskSubmission?: boolean | TaskActivity$taskSubmissionArgs<ExtArgs>
  }, ExtArgs["result"]["taskActivity"]>

  export type TaskActivitySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    userId?: boolean
    taskSubmissionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
    user?: boolean | TaskActivity$userArgs<ExtArgs>
    taskSubmission?: boolean | TaskActivity$taskSubmissionArgs<ExtArgs>
  }, ExtArgs["result"]["taskActivity"]>

  export type TaskActivitySelectScalar = {
    id?: boolean
    taskId?: boolean
    userId?: boolean
    taskSubmissionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TaskActivityOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "taskId" | "userId" | "taskSubmissionId" | "createdAt" | "updatedAt", ExtArgs["result"]["taskActivity"]>
  export type TaskActivityInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
    user?: boolean | TaskActivity$userArgs<ExtArgs>
    taskSubmission?: boolean | TaskActivity$taskSubmissionArgs<ExtArgs>
  }
  export type TaskActivityIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
    user?: boolean | TaskActivity$userArgs<ExtArgs>
    taskSubmission?: boolean | TaskActivity$taskSubmissionArgs<ExtArgs>
  }
  export type TaskActivityIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
    user?: boolean | TaskActivity$userArgs<ExtArgs>
    taskSubmission?: boolean | TaskActivity$taskSubmissionArgs<ExtArgs>
  }

  export type $TaskActivityPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TaskActivity"
    objects: {
      task: Prisma.$TaskPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs> | null
      taskSubmission: Prisma.$TaskSubmissionPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      taskId: string
      userId: string | null
      taskSubmissionId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["taskActivity"]>
    composites: {}
  }

  type TaskActivityGetPayload<S extends boolean | null | undefined | TaskActivityDefaultArgs> = $Result.GetResult<Prisma.$TaskActivityPayload, S>

  type TaskActivityCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskActivityFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskActivityCountAggregateInputType | true
    }

  export interface TaskActivityDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TaskActivity'], meta: { name: 'TaskActivity' } }
    /**
     * Find zero or one TaskActivity that matches the filter.
     * @param {TaskActivityFindUniqueArgs} args - Arguments to find a TaskActivity
     * @example
     * // Get one TaskActivity
     * const taskActivity = await prisma.taskActivity.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskActivityFindUniqueArgs>(args: SelectSubset<T, TaskActivityFindUniqueArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TaskActivity that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskActivityFindUniqueOrThrowArgs} args - Arguments to find a TaskActivity
     * @example
     * // Get one TaskActivity
     * const taskActivity = await prisma.taskActivity.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskActivityFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskActivityFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskActivity that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskActivityFindFirstArgs} args - Arguments to find a TaskActivity
     * @example
     * // Get one TaskActivity
     * const taskActivity = await prisma.taskActivity.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskActivityFindFirstArgs>(args?: SelectSubset<T, TaskActivityFindFirstArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskActivity that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskActivityFindFirstOrThrowArgs} args - Arguments to find a TaskActivity
     * @example
     * // Get one TaskActivity
     * const taskActivity = await prisma.taskActivity.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskActivityFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskActivityFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TaskActivities that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskActivityFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TaskActivities
     * const taskActivities = await prisma.taskActivity.findMany()
     * 
     * // Get first 10 TaskActivities
     * const taskActivities = await prisma.taskActivity.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskActivityWithIdOnly = await prisma.taskActivity.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskActivityFindManyArgs>(args?: SelectSubset<T, TaskActivityFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TaskActivity.
     * @param {TaskActivityCreateArgs} args - Arguments to create a TaskActivity.
     * @example
     * // Create one TaskActivity
     * const TaskActivity = await prisma.taskActivity.create({
     *   data: {
     *     // ... data to create a TaskActivity
     *   }
     * })
     * 
     */
    create<T extends TaskActivityCreateArgs>(args: SelectSubset<T, TaskActivityCreateArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TaskActivities.
     * @param {TaskActivityCreateManyArgs} args - Arguments to create many TaskActivities.
     * @example
     * // Create many TaskActivities
     * const taskActivity = await prisma.taskActivity.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskActivityCreateManyArgs>(args?: SelectSubset<T, TaskActivityCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TaskActivities and returns the data saved in the database.
     * @param {TaskActivityCreateManyAndReturnArgs} args - Arguments to create many TaskActivities.
     * @example
     * // Create many TaskActivities
     * const taskActivity = await prisma.taskActivity.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TaskActivities and only return the `id`
     * const taskActivityWithIdOnly = await prisma.taskActivity.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskActivityCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskActivityCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TaskActivity.
     * @param {TaskActivityDeleteArgs} args - Arguments to delete one TaskActivity.
     * @example
     * // Delete one TaskActivity
     * const TaskActivity = await prisma.taskActivity.delete({
     *   where: {
     *     // ... filter to delete one TaskActivity
     *   }
     * })
     * 
     */
    delete<T extends TaskActivityDeleteArgs>(args: SelectSubset<T, TaskActivityDeleteArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TaskActivity.
     * @param {TaskActivityUpdateArgs} args - Arguments to update one TaskActivity.
     * @example
     * // Update one TaskActivity
     * const taskActivity = await prisma.taskActivity.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskActivityUpdateArgs>(args: SelectSubset<T, TaskActivityUpdateArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TaskActivities.
     * @param {TaskActivityDeleteManyArgs} args - Arguments to filter TaskActivities to delete.
     * @example
     * // Delete a few TaskActivities
     * const { count } = await prisma.taskActivity.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskActivityDeleteManyArgs>(args?: SelectSubset<T, TaskActivityDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskActivities.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskActivityUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TaskActivities
     * const taskActivity = await prisma.taskActivity.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskActivityUpdateManyArgs>(args: SelectSubset<T, TaskActivityUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskActivities and returns the data updated in the database.
     * @param {TaskActivityUpdateManyAndReturnArgs} args - Arguments to update many TaskActivities.
     * @example
     * // Update many TaskActivities
     * const taskActivity = await prisma.taskActivity.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TaskActivities and only return the `id`
     * const taskActivityWithIdOnly = await prisma.taskActivity.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskActivityUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskActivityUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TaskActivity.
     * @param {TaskActivityUpsertArgs} args - Arguments to update or create a TaskActivity.
     * @example
     * // Update or create a TaskActivity
     * const taskActivity = await prisma.taskActivity.upsert({
     *   create: {
     *     // ... data to create a TaskActivity
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TaskActivity we want to update
     *   }
     * })
     */
    upsert<T extends TaskActivityUpsertArgs>(args: SelectSubset<T, TaskActivityUpsertArgs<ExtArgs>>): Prisma__TaskActivityClient<$Result.GetResult<Prisma.$TaskActivityPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TaskActivities.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskActivityCountArgs} args - Arguments to filter TaskActivities to count.
     * @example
     * // Count the number of TaskActivities
     * const count = await prisma.taskActivity.count({
     *   where: {
     *     // ... the filter for the TaskActivities we want to count
     *   }
     * })
    **/
    count<T extends TaskActivityCountArgs>(
      args?: Subset<T, TaskActivityCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskActivityCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TaskActivity.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskActivityAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskActivityAggregateArgs>(args: Subset<T, TaskActivityAggregateArgs>): Prisma.PrismaPromise<GetTaskActivityAggregateType<T>>

    /**
     * Group by TaskActivity.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskActivityGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskActivityGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskActivityGroupByArgs['orderBy'] }
        : { orderBy?: TaskActivityGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskActivityGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskActivityGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TaskActivity model
   */
  readonly fields: TaskActivityFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TaskActivity.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskActivityClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    task<T extends TaskDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TaskDefaultArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends TaskActivity$userArgs<ExtArgs> = {}>(args?: Subset<T, TaskActivity$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    taskSubmission<T extends TaskActivity$taskSubmissionArgs<ExtArgs> = {}>(args?: Subset<T, TaskActivity$taskSubmissionArgs<ExtArgs>>): Prisma__TaskSubmissionClient<$Result.GetResult<Prisma.$TaskSubmissionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TaskActivity model
   */
  interface TaskActivityFieldRefs {
    readonly id: FieldRef<"TaskActivity", 'String'>
    readonly taskId: FieldRef<"TaskActivity", 'String'>
    readonly userId: FieldRef<"TaskActivity", 'String'>
    readonly taskSubmissionId: FieldRef<"TaskActivity", 'String'>
    readonly createdAt: FieldRef<"TaskActivity", 'DateTime'>
    readonly updatedAt: FieldRef<"TaskActivity", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TaskActivity findUnique
   */
  export type TaskActivityFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * Filter, which TaskActivity to fetch.
     */
    where: TaskActivityWhereUniqueInput
  }

  /**
   * TaskActivity findUniqueOrThrow
   */
  export type TaskActivityFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * Filter, which TaskActivity to fetch.
     */
    where: TaskActivityWhereUniqueInput
  }

  /**
   * TaskActivity findFirst
   */
  export type TaskActivityFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * Filter, which TaskActivity to fetch.
     */
    where?: TaskActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskActivities to fetch.
     */
    orderBy?: TaskActivityOrderByWithRelationInput | TaskActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskActivities.
     */
    cursor?: TaskActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskActivities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskActivities.
     */
    distinct?: TaskActivityScalarFieldEnum | TaskActivityScalarFieldEnum[]
  }

  /**
   * TaskActivity findFirstOrThrow
   */
  export type TaskActivityFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * Filter, which TaskActivity to fetch.
     */
    where?: TaskActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskActivities to fetch.
     */
    orderBy?: TaskActivityOrderByWithRelationInput | TaskActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskActivities.
     */
    cursor?: TaskActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskActivities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskActivities.
     */
    distinct?: TaskActivityScalarFieldEnum | TaskActivityScalarFieldEnum[]
  }

  /**
   * TaskActivity findMany
   */
  export type TaskActivityFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * Filter, which TaskActivities to fetch.
     */
    where?: TaskActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskActivities to fetch.
     */
    orderBy?: TaskActivityOrderByWithRelationInput | TaskActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TaskActivities.
     */
    cursor?: TaskActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskActivities.
     */
    skip?: number
    distinct?: TaskActivityScalarFieldEnum | TaskActivityScalarFieldEnum[]
  }

  /**
   * TaskActivity create
   */
  export type TaskActivityCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * The data needed to create a TaskActivity.
     */
    data: XOR<TaskActivityCreateInput, TaskActivityUncheckedCreateInput>
  }

  /**
   * TaskActivity createMany
   */
  export type TaskActivityCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TaskActivities.
     */
    data: TaskActivityCreateManyInput | TaskActivityCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TaskActivity createManyAndReturn
   */
  export type TaskActivityCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * The data used to create many TaskActivities.
     */
    data: TaskActivityCreateManyInput | TaskActivityCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TaskActivity update
   */
  export type TaskActivityUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * The data needed to update a TaskActivity.
     */
    data: XOR<TaskActivityUpdateInput, TaskActivityUncheckedUpdateInput>
    /**
     * Choose, which TaskActivity to update.
     */
    where: TaskActivityWhereUniqueInput
  }

  /**
   * TaskActivity updateMany
   */
  export type TaskActivityUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TaskActivities.
     */
    data: XOR<TaskActivityUpdateManyMutationInput, TaskActivityUncheckedUpdateManyInput>
    /**
     * Filter which TaskActivities to update
     */
    where?: TaskActivityWhereInput
    /**
     * Limit how many TaskActivities to update.
     */
    limit?: number
  }

  /**
   * TaskActivity updateManyAndReturn
   */
  export type TaskActivityUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * The data used to update TaskActivities.
     */
    data: XOR<TaskActivityUpdateManyMutationInput, TaskActivityUncheckedUpdateManyInput>
    /**
     * Filter which TaskActivities to update
     */
    where?: TaskActivityWhereInput
    /**
     * Limit how many TaskActivities to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TaskActivity upsert
   */
  export type TaskActivityUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * The filter to search for the TaskActivity to update in case it exists.
     */
    where: TaskActivityWhereUniqueInput
    /**
     * In case the TaskActivity found by the `where` argument doesn't exist, create a new TaskActivity with this data.
     */
    create: XOR<TaskActivityCreateInput, TaskActivityUncheckedCreateInput>
    /**
     * In case the TaskActivity was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskActivityUpdateInput, TaskActivityUncheckedUpdateInput>
  }

  /**
   * TaskActivity delete
   */
  export type TaskActivityDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
    /**
     * Filter which TaskActivity to delete.
     */
    where: TaskActivityWhereUniqueInput
  }

  /**
   * TaskActivity deleteMany
   */
  export type TaskActivityDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskActivities to delete
     */
    where?: TaskActivityWhereInput
    /**
     * Limit how many TaskActivities to delete.
     */
    limit?: number
  }

  /**
   * TaskActivity.user
   */
  export type TaskActivity$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * TaskActivity.taskSubmission
   */
  export type TaskActivity$taskSubmissionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskSubmission
     */
    select?: TaskSubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskSubmission
     */
    omit?: TaskSubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskSubmissionInclude<ExtArgs> | null
    where?: TaskSubmissionWhereInput
  }

  /**
   * TaskActivity without action
   */
  export type TaskActivityDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskActivity
     */
    select?: TaskActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskActivity
     */
    omit?: TaskActivityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskActivityInclude<ExtArgs> | null
  }


  /**
   * Model Permission
   */

  export type AggregatePermission = {
    _count: PermissionCountAggregateOutputType | null
    _min: PermissionMinAggregateOutputType | null
    _max: PermissionMaxAggregateOutputType | null
  }

  export type PermissionMinAggregateOutputType = {
    code: string | null
    name: string | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PermissionMaxAggregateOutputType = {
    code: string | null
    name: string | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PermissionCountAggregateOutputType = {
    code: number
    name: number
    isDefault: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PermissionMinAggregateInputType = {
    code?: true
    name?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PermissionMaxAggregateInputType = {
    code?: true
    name?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PermissionCountAggregateInputType = {
    code?: true
    name?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PermissionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Permission to aggregate.
     */
    where?: PermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permissions to fetch.
     */
    orderBy?: PermissionOrderByWithRelationInput | PermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Permissions
    **/
    _count?: true | PermissionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PermissionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PermissionMaxAggregateInputType
  }

  export type GetPermissionAggregateType<T extends PermissionAggregateArgs> = {
        [P in keyof T & keyof AggregatePermission]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePermission[P]>
      : GetScalarType<T[P], AggregatePermission[P]>
  }




  export type PermissionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PermissionWhereInput
    orderBy?: PermissionOrderByWithAggregationInput | PermissionOrderByWithAggregationInput[]
    by: PermissionScalarFieldEnum[] | PermissionScalarFieldEnum
    having?: PermissionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PermissionCountAggregateInputType | true
    _min?: PermissionMinAggregateInputType
    _max?: PermissionMaxAggregateInputType
  }

  export type PermissionGroupByOutputType = {
    code: string
    name: string
    isDefault: boolean
    createdAt: Date
    updatedAt: Date
    _count: PermissionCountAggregateOutputType | null
    _min: PermissionMinAggregateOutputType | null
    _max: PermissionMaxAggregateOutputType | null
  }

  type GetPermissionGroupByPayload<T extends PermissionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PermissionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PermissionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PermissionGroupByOutputType[P]>
            : GetScalarType<T[P], PermissionGroupByOutputType[P]>
        }
      >
    >


  export type PermissionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    code?: boolean
    name?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userInstallationPermissions?: boolean | Permission$userInstallationPermissionsArgs<ExtArgs>
    _count?: boolean | PermissionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["permission"]>

  export type PermissionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    code?: boolean
    name?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["permission"]>

  export type PermissionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    code?: boolean
    name?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["permission"]>

  export type PermissionSelectScalar = {
    code?: boolean
    name?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PermissionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"code" | "name" | "isDefault" | "createdAt" | "updatedAt", ExtArgs["result"]["permission"]>
  export type PermissionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userInstallationPermissions?: boolean | Permission$userInstallationPermissionsArgs<ExtArgs>
    _count?: boolean | PermissionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PermissionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type PermissionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $PermissionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Permission"
    objects: {
      userInstallationPermissions: Prisma.$UserInstallationPermissionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      code: string
      name: string
      isDefault: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["permission"]>
    composites: {}
  }

  type PermissionGetPayload<S extends boolean | null | undefined | PermissionDefaultArgs> = $Result.GetResult<Prisma.$PermissionPayload, S>

  type PermissionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PermissionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PermissionCountAggregateInputType | true
    }

  export interface PermissionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Permission'], meta: { name: 'Permission' } }
    /**
     * Find zero or one Permission that matches the filter.
     * @param {PermissionFindUniqueArgs} args - Arguments to find a Permission
     * @example
     * // Get one Permission
     * const permission = await prisma.permission.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PermissionFindUniqueArgs>(args: SelectSubset<T, PermissionFindUniqueArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Permission that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PermissionFindUniqueOrThrowArgs} args - Arguments to find a Permission
     * @example
     * // Get one Permission
     * const permission = await prisma.permission.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PermissionFindUniqueOrThrowArgs>(args: SelectSubset<T, PermissionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Permission that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermissionFindFirstArgs} args - Arguments to find a Permission
     * @example
     * // Get one Permission
     * const permission = await prisma.permission.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PermissionFindFirstArgs>(args?: SelectSubset<T, PermissionFindFirstArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Permission that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermissionFindFirstOrThrowArgs} args - Arguments to find a Permission
     * @example
     * // Get one Permission
     * const permission = await prisma.permission.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PermissionFindFirstOrThrowArgs>(args?: SelectSubset<T, PermissionFindFirstOrThrowArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Permissions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermissionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Permissions
     * const permissions = await prisma.permission.findMany()
     * 
     * // Get first 10 Permissions
     * const permissions = await prisma.permission.findMany({ take: 10 })
     * 
     * // Only select the `code`
     * const permissionWithCodeOnly = await prisma.permission.findMany({ select: { code: true } })
     * 
     */
    findMany<T extends PermissionFindManyArgs>(args?: SelectSubset<T, PermissionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Permission.
     * @param {PermissionCreateArgs} args - Arguments to create a Permission.
     * @example
     * // Create one Permission
     * const Permission = await prisma.permission.create({
     *   data: {
     *     // ... data to create a Permission
     *   }
     * })
     * 
     */
    create<T extends PermissionCreateArgs>(args: SelectSubset<T, PermissionCreateArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Permissions.
     * @param {PermissionCreateManyArgs} args - Arguments to create many Permissions.
     * @example
     * // Create many Permissions
     * const permission = await prisma.permission.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PermissionCreateManyArgs>(args?: SelectSubset<T, PermissionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Permissions and returns the data saved in the database.
     * @param {PermissionCreateManyAndReturnArgs} args - Arguments to create many Permissions.
     * @example
     * // Create many Permissions
     * const permission = await prisma.permission.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Permissions and only return the `code`
     * const permissionWithCodeOnly = await prisma.permission.createManyAndReturn({
     *   select: { code: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PermissionCreateManyAndReturnArgs>(args?: SelectSubset<T, PermissionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Permission.
     * @param {PermissionDeleteArgs} args - Arguments to delete one Permission.
     * @example
     * // Delete one Permission
     * const Permission = await prisma.permission.delete({
     *   where: {
     *     // ... filter to delete one Permission
     *   }
     * })
     * 
     */
    delete<T extends PermissionDeleteArgs>(args: SelectSubset<T, PermissionDeleteArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Permission.
     * @param {PermissionUpdateArgs} args - Arguments to update one Permission.
     * @example
     * // Update one Permission
     * const permission = await prisma.permission.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PermissionUpdateArgs>(args: SelectSubset<T, PermissionUpdateArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Permissions.
     * @param {PermissionDeleteManyArgs} args - Arguments to filter Permissions to delete.
     * @example
     * // Delete a few Permissions
     * const { count } = await prisma.permission.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PermissionDeleteManyArgs>(args?: SelectSubset<T, PermissionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Permissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermissionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Permissions
     * const permission = await prisma.permission.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PermissionUpdateManyArgs>(args: SelectSubset<T, PermissionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Permissions and returns the data updated in the database.
     * @param {PermissionUpdateManyAndReturnArgs} args - Arguments to update many Permissions.
     * @example
     * // Update many Permissions
     * const permission = await prisma.permission.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Permissions and only return the `code`
     * const permissionWithCodeOnly = await prisma.permission.updateManyAndReturn({
     *   select: { code: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PermissionUpdateManyAndReturnArgs>(args: SelectSubset<T, PermissionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Permission.
     * @param {PermissionUpsertArgs} args - Arguments to update or create a Permission.
     * @example
     * // Update or create a Permission
     * const permission = await prisma.permission.upsert({
     *   create: {
     *     // ... data to create a Permission
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Permission we want to update
     *   }
     * })
     */
    upsert<T extends PermissionUpsertArgs>(args: SelectSubset<T, PermissionUpsertArgs<ExtArgs>>): Prisma__PermissionClient<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Permissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermissionCountArgs} args - Arguments to filter Permissions to count.
     * @example
     * // Count the number of Permissions
     * const count = await prisma.permission.count({
     *   where: {
     *     // ... the filter for the Permissions we want to count
     *   }
     * })
    **/
    count<T extends PermissionCountArgs>(
      args?: Subset<T, PermissionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PermissionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Permission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermissionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PermissionAggregateArgs>(args: Subset<T, PermissionAggregateArgs>): Prisma.PrismaPromise<GetPermissionAggregateType<T>>

    /**
     * Group by Permission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermissionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PermissionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PermissionGroupByArgs['orderBy'] }
        : { orderBy?: PermissionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PermissionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPermissionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Permission model
   */
  readonly fields: PermissionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Permission.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PermissionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    userInstallationPermissions<T extends Permission$userInstallationPermissionsArgs<ExtArgs> = {}>(args?: Subset<T, Permission$userInstallationPermissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Permission model
   */
  interface PermissionFieldRefs {
    readonly code: FieldRef<"Permission", 'String'>
    readonly name: FieldRef<"Permission", 'String'>
    readonly isDefault: FieldRef<"Permission", 'Boolean'>
    readonly createdAt: FieldRef<"Permission", 'DateTime'>
    readonly updatedAt: FieldRef<"Permission", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Permission findUnique
   */
  export type PermissionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * Filter, which Permission to fetch.
     */
    where: PermissionWhereUniqueInput
  }

  /**
   * Permission findUniqueOrThrow
   */
  export type PermissionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * Filter, which Permission to fetch.
     */
    where: PermissionWhereUniqueInput
  }

  /**
   * Permission findFirst
   */
  export type PermissionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * Filter, which Permission to fetch.
     */
    where?: PermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permissions to fetch.
     */
    orderBy?: PermissionOrderByWithRelationInput | PermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Permissions.
     */
    cursor?: PermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Permissions.
     */
    distinct?: PermissionScalarFieldEnum | PermissionScalarFieldEnum[]
  }

  /**
   * Permission findFirstOrThrow
   */
  export type PermissionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * Filter, which Permission to fetch.
     */
    where?: PermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permissions to fetch.
     */
    orderBy?: PermissionOrderByWithRelationInput | PermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Permissions.
     */
    cursor?: PermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Permissions.
     */
    distinct?: PermissionScalarFieldEnum | PermissionScalarFieldEnum[]
  }

  /**
   * Permission findMany
   */
  export type PermissionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * Filter, which Permissions to fetch.
     */
    where?: PermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permissions to fetch.
     */
    orderBy?: PermissionOrderByWithRelationInput | PermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Permissions.
     */
    cursor?: PermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permissions.
     */
    skip?: number
    distinct?: PermissionScalarFieldEnum | PermissionScalarFieldEnum[]
  }

  /**
   * Permission create
   */
  export type PermissionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * The data needed to create a Permission.
     */
    data: XOR<PermissionCreateInput, PermissionUncheckedCreateInput>
  }

  /**
   * Permission createMany
   */
  export type PermissionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Permissions.
     */
    data: PermissionCreateManyInput | PermissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Permission createManyAndReturn
   */
  export type PermissionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * The data used to create many Permissions.
     */
    data: PermissionCreateManyInput | PermissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Permission update
   */
  export type PermissionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * The data needed to update a Permission.
     */
    data: XOR<PermissionUpdateInput, PermissionUncheckedUpdateInput>
    /**
     * Choose, which Permission to update.
     */
    where: PermissionWhereUniqueInput
  }

  /**
   * Permission updateMany
   */
  export type PermissionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Permissions.
     */
    data: XOR<PermissionUpdateManyMutationInput, PermissionUncheckedUpdateManyInput>
    /**
     * Filter which Permissions to update
     */
    where?: PermissionWhereInput
    /**
     * Limit how many Permissions to update.
     */
    limit?: number
  }

  /**
   * Permission updateManyAndReturn
   */
  export type PermissionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * The data used to update Permissions.
     */
    data: XOR<PermissionUpdateManyMutationInput, PermissionUncheckedUpdateManyInput>
    /**
     * Filter which Permissions to update
     */
    where?: PermissionWhereInput
    /**
     * Limit how many Permissions to update.
     */
    limit?: number
  }

  /**
   * Permission upsert
   */
  export type PermissionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * The filter to search for the Permission to update in case it exists.
     */
    where: PermissionWhereUniqueInput
    /**
     * In case the Permission found by the `where` argument doesn't exist, create a new Permission with this data.
     */
    create: XOR<PermissionCreateInput, PermissionUncheckedCreateInput>
    /**
     * In case the Permission was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PermissionUpdateInput, PermissionUncheckedUpdateInput>
  }

  /**
   * Permission delete
   */
  export type PermissionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    /**
     * Filter which Permission to delete.
     */
    where: PermissionWhereUniqueInput
  }

  /**
   * Permission deleteMany
   */
  export type PermissionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Permissions to delete
     */
    where?: PermissionWhereInput
    /**
     * Limit how many Permissions to delete.
     */
    limit?: number
  }

  /**
   * Permission.userInstallationPermissions
   */
  export type Permission$userInstallationPermissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    where?: UserInstallationPermissionWhereInput
    orderBy?: UserInstallationPermissionOrderByWithRelationInput | UserInstallationPermissionOrderByWithRelationInput[]
    cursor?: UserInstallationPermissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserInstallationPermissionScalarFieldEnum | UserInstallationPermissionScalarFieldEnum[]
  }

  /**
   * Permission without action
   */
  export type PermissionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
  }


  /**
   * Model UserInstallationPermission
   */

  export type AggregateUserInstallationPermission = {
    _count: UserInstallationPermissionCountAggregateOutputType | null
    _min: UserInstallationPermissionMinAggregateOutputType | null
    _max: UserInstallationPermissionMaxAggregateOutputType | null
  }

  export type UserInstallationPermissionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    installationId: string | null
    assignedBy: string | null
    assignedAt: Date | null
  }

  export type UserInstallationPermissionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    installationId: string | null
    assignedBy: string | null
    assignedAt: Date | null
  }

  export type UserInstallationPermissionCountAggregateOutputType = {
    id: number
    userId: number
    installationId: number
    permissionCodes: number
    assignedBy: number
    assignedAt: number
    _all: number
  }


  export type UserInstallationPermissionMinAggregateInputType = {
    id?: true
    userId?: true
    installationId?: true
    assignedBy?: true
    assignedAt?: true
  }

  export type UserInstallationPermissionMaxAggregateInputType = {
    id?: true
    userId?: true
    installationId?: true
    assignedBy?: true
    assignedAt?: true
  }

  export type UserInstallationPermissionCountAggregateInputType = {
    id?: true
    userId?: true
    installationId?: true
    permissionCodes?: true
    assignedBy?: true
    assignedAt?: true
    _all?: true
  }

  export type UserInstallationPermissionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserInstallationPermission to aggregate.
     */
    where?: UserInstallationPermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserInstallationPermissions to fetch.
     */
    orderBy?: UserInstallationPermissionOrderByWithRelationInput | UserInstallationPermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserInstallationPermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserInstallationPermissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserInstallationPermissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserInstallationPermissions
    **/
    _count?: true | UserInstallationPermissionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserInstallationPermissionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserInstallationPermissionMaxAggregateInputType
  }

  export type GetUserInstallationPermissionAggregateType<T extends UserInstallationPermissionAggregateArgs> = {
        [P in keyof T & keyof AggregateUserInstallationPermission]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserInstallationPermission[P]>
      : GetScalarType<T[P], AggregateUserInstallationPermission[P]>
  }




  export type UserInstallationPermissionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserInstallationPermissionWhereInput
    orderBy?: UserInstallationPermissionOrderByWithAggregationInput | UserInstallationPermissionOrderByWithAggregationInput[]
    by: UserInstallationPermissionScalarFieldEnum[] | UserInstallationPermissionScalarFieldEnum
    having?: UserInstallationPermissionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserInstallationPermissionCountAggregateInputType | true
    _min?: UserInstallationPermissionMinAggregateInputType
    _max?: UserInstallationPermissionMaxAggregateInputType
  }

  export type UserInstallationPermissionGroupByOutputType = {
    id: string
    userId: string
    installationId: string
    permissionCodes: string[]
    assignedBy: string | null
    assignedAt: Date
    _count: UserInstallationPermissionCountAggregateOutputType | null
    _min: UserInstallationPermissionMinAggregateOutputType | null
    _max: UserInstallationPermissionMaxAggregateOutputType | null
  }

  type GetUserInstallationPermissionGroupByPayload<T extends UserInstallationPermissionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserInstallationPermissionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserInstallationPermissionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserInstallationPermissionGroupByOutputType[P]>
            : GetScalarType<T[P], UserInstallationPermissionGroupByOutputType[P]>
        }
      >
    >


  export type UserInstallationPermissionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    installationId?: boolean
    permissionCodes?: boolean
    assignedBy?: boolean
    assignedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
    permissions?: boolean | UserInstallationPermission$permissionsArgs<ExtArgs>
    _count?: boolean | UserInstallationPermissionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userInstallationPermission"]>

  export type UserInstallationPermissionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    installationId?: boolean
    permissionCodes?: boolean
    assignedBy?: boolean
    assignedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userInstallationPermission"]>

  export type UserInstallationPermissionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    installationId?: boolean
    permissionCodes?: boolean
    assignedBy?: boolean
    assignedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userInstallationPermission"]>

  export type UserInstallationPermissionSelectScalar = {
    id?: boolean
    userId?: boolean
    installationId?: boolean
    permissionCodes?: boolean
    assignedBy?: boolean
    assignedAt?: boolean
  }

  export type UserInstallationPermissionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "installationId" | "permissionCodes" | "assignedBy" | "assignedAt", ExtArgs["result"]["userInstallationPermission"]>
  export type UserInstallationPermissionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
    permissions?: boolean | UserInstallationPermission$permissionsArgs<ExtArgs>
    _count?: boolean | UserInstallationPermissionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserInstallationPermissionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }
  export type UserInstallationPermissionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    installation?: boolean | InstallationDefaultArgs<ExtArgs>
  }

  export type $UserInstallationPermissionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserInstallationPermission"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      installation: Prisma.$InstallationPayload<ExtArgs>
      permissions: Prisma.$PermissionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      installationId: string
      permissionCodes: string[]
      assignedBy: string | null
      assignedAt: Date
    }, ExtArgs["result"]["userInstallationPermission"]>
    composites: {}
  }

  type UserInstallationPermissionGetPayload<S extends boolean | null | undefined | UserInstallationPermissionDefaultArgs> = $Result.GetResult<Prisma.$UserInstallationPermissionPayload, S>

  type UserInstallationPermissionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserInstallationPermissionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserInstallationPermissionCountAggregateInputType | true
    }

  export interface UserInstallationPermissionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserInstallationPermission'], meta: { name: 'UserInstallationPermission' } }
    /**
     * Find zero or one UserInstallationPermission that matches the filter.
     * @param {UserInstallationPermissionFindUniqueArgs} args - Arguments to find a UserInstallationPermission
     * @example
     * // Get one UserInstallationPermission
     * const userInstallationPermission = await prisma.userInstallationPermission.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserInstallationPermissionFindUniqueArgs>(args: SelectSubset<T, UserInstallationPermissionFindUniqueArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserInstallationPermission that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserInstallationPermissionFindUniqueOrThrowArgs} args - Arguments to find a UserInstallationPermission
     * @example
     * // Get one UserInstallationPermission
     * const userInstallationPermission = await prisma.userInstallationPermission.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserInstallationPermissionFindUniqueOrThrowArgs>(args: SelectSubset<T, UserInstallationPermissionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserInstallationPermission that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserInstallationPermissionFindFirstArgs} args - Arguments to find a UserInstallationPermission
     * @example
     * // Get one UserInstallationPermission
     * const userInstallationPermission = await prisma.userInstallationPermission.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserInstallationPermissionFindFirstArgs>(args?: SelectSubset<T, UserInstallationPermissionFindFirstArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserInstallationPermission that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserInstallationPermissionFindFirstOrThrowArgs} args - Arguments to find a UserInstallationPermission
     * @example
     * // Get one UserInstallationPermission
     * const userInstallationPermission = await prisma.userInstallationPermission.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserInstallationPermissionFindFirstOrThrowArgs>(args?: SelectSubset<T, UserInstallationPermissionFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserInstallationPermissions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserInstallationPermissionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserInstallationPermissions
     * const userInstallationPermissions = await prisma.userInstallationPermission.findMany()
     * 
     * // Get first 10 UserInstallationPermissions
     * const userInstallationPermissions = await prisma.userInstallationPermission.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userInstallationPermissionWithIdOnly = await prisma.userInstallationPermission.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserInstallationPermissionFindManyArgs>(args?: SelectSubset<T, UserInstallationPermissionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserInstallationPermission.
     * @param {UserInstallationPermissionCreateArgs} args - Arguments to create a UserInstallationPermission.
     * @example
     * // Create one UserInstallationPermission
     * const UserInstallationPermission = await prisma.userInstallationPermission.create({
     *   data: {
     *     // ... data to create a UserInstallationPermission
     *   }
     * })
     * 
     */
    create<T extends UserInstallationPermissionCreateArgs>(args: SelectSubset<T, UserInstallationPermissionCreateArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserInstallationPermissions.
     * @param {UserInstallationPermissionCreateManyArgs} args - Arguments to create many UserInstallationPermissions.
     * @example
     * // Create many UserInstallationPermissions
     * const userInstallationPermission = await prisma.userInstallationPermission.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserInstallationPermissionCreateManyArgs>(args?: SelectSubset<T, UserInstallationPermissionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserInstallationPermissions and returns the data saved in the database.
     * @param {UserInstallationPermissionCreateManyAndReturnArgs} args - Arguments to create many UserInstallationPermissions.
     * @example
     * // Create many UserInstallationPermissions
     * const userInstallationPermission = await prisma.userInstallationPermission.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserInstallationPermissions and only return the `id`
     * const userInstallationPermissionWithIdOnly = await prisma.userInstallationPermission.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserInstallationPermissionCreateManyAndReturnArgs>(args?: SelectSubset<T, UserInstallationPermissionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserInstallationPermission.
     * @param {UserInstallationPermissionDeleteArgs} args - Arguments to delete one UserInstallationPermission.
     * @example
     * // Delete one UserInstallationPermission
     * const UserInstallationPermission = await prisma.userInstallationPermission.delete({
     *   where: {
     *     // ... filter to delete one UserInstallationPermission
     *   }
     * })
     * 
     */
    delete<T extends UserInstallationPermissionDeleteArgs>(args: SelectSubset<T, UserInstallationPermissionDeleteArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserInstallationPermission.
     * @param {UserInstallationPermissionUpdateArgs} args - Arguments to update one UserInstallationPermission.
     * @example
     * // Update one UserInstallationPermission
     * const userInstallationPermission = await prisma.userInstallationPermission.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserInstallationPermissionUpdateArgs>(args: SelectSubset<T, UserInstallationPermissionUpdateArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserInstallationPermissions.
     * @param {UserInstallationPermissionDeleteManyArgs} args - Arguments to filter UserInstallationPermissions to delete.
     * @example
     * // Delete a few UserInstallationPermissions
     * const { count } = await prisma.userInstallationPermission.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserInstallationPermissionDeleteManyArgs>(args?: SelectSubset<T, UserInstallationPermissionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserInstallationPermissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserInstallationPermissionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserInstallationPermissions
     * const userInstallationPermission = await prisma.userInstallationPermission.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserInstallationPermissionUpdateManyArgs>(args: SelectSubset<T, UserInstallationPermissionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserInstallationPermissions and returns the data updated in the database.
     * @param {UserInstallationPermissionUpdateManyAndReturnArgs} args - Arguments to update many UserInstallationPermissions.
     * @example
     * // Update many UserInstallationPermissions
     * const userInstallationPermission = await prisma.userInstallationPermission.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserInstallationPermissions and only return the `id`
     * const userInstallationPermissionWithIdOnly = await prisma.userInstallationPermission.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserInstallationPermissionUpdateManyAndReturnArgs>(args: SelectSubset<T, UserInstallationPermissionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserInstallationPermission.
     * @param {UserInstallationPermissionUpsertArgs} args - Arguments to update or create a UserInstallationPermission.
     * @example
     * // Update or create a UserInstallationPermission
     * const userInstallationPermission = await prisma.userInstallationPermission.upsert({
     *   create: {
     *     // ... data to create a UserInstallationPermission
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserInstallationPermission we want to update
     *   }
     * })
     */
    upsert<T extends UserInstallationPermissionUpsertArgs>(args: SelectSubset<T, UserInstallationPermissionUpsertArgs<ExtArgs>>): Prisma__UserInstallationPermissionClient<$Result.GetResult<Prisma.$UserInstallationPermissionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserInstallationPermissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserInstallationPermissionCountArgs} args - Arguments to filter UserInstallationPermissions to count.
     * @example
     * // Count the number of UserInstallationPermissions
     * const count = await prisma.userInstallationPermission.count({
     *   where: {
     *     // ... the filter for the UserInstallationPermissions we want to count
     *   }
     * })
    **/
    count<T extends UserInstallationPermissionCountArgs>(
      args?: Subset<T, UserInstallationPermissionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserInstallationPermissionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserInstallationPermission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserInstallationPermissionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserInstallationPermissionAggregateArgs>(args: Subset<T, UserInstallationPermissionAggregateArgs>): Prisma.PrismaPromise<GetUserInstallationPermissionAggregateType<T>>

    /**
     * Group by UserInstallationPermission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserInstallationPermissionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserInstallationPermissionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserInstallationPermissionGroupByArgs['orderBy'] }
        : { orderBy?: UserInstallationPermissionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserInstallationPermissionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserInstallationPermissionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserInstallationPermission model
   */
  readonly fields: UserInstallationPermissionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserInstallationPermission.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserInstallationPermissionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    installation<T extends InstallationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstallationDefaultArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    permissions<T extends UserInstallationPermission$permissionsArgs<ExtArgs> = {}>(args?: Subset<T, UserInstallationPermission$permissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PermissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserInstallationPermission model
   */
  interface UserInstallationPermissionFieldRefs {
    readonly id: FieldRef<"UserInstallationPermission", 'String'>
    readonly userId: FieldRef<"UserInstallationPermission", 'String'>
    readonly installationId: FieldRef<"UserInstallationPermission", 'String'>
    readonly permissionCodes: FieldRef<"UserInstallationPermission", 'String[]'>
    readonly assignedBy: FieldRef<"UserInstallationPermission", 'String'>
    readonly assignedAt: FieldRef<"UserInstallationPermission", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserInstallationPermission findUnique
   */
  export type UserInstallationPermissionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * Filter, which UserInstallationPermission to fetch.
     */
    where: UserInstallationPermissionWhereUniqueInput
  }

  /**
   * UserInstallationPermission findUniqueOrThrow
   */
  export type UserInstallationPermissionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * Filter, which UserInstallationPermission to fetch.
     */
    where: UserInstallationPermissionWhereUniqueInput
  }

  /**
   * UserInstallationPermission findFirst
   */
  export type UserInstallationPermissionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * Filter, which UserInstallationPermission to fetch.
     */
    where?: UserInstallationPermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserInstallationPermissions to fetch.
     */
    orderBy?: UserInstallationPermissionOrderByWithRelationInput | UserInstallationPermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserInstallationPermissions.
     */
    cursor?: UserInstallationPermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserInstallationPermissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserInstallationPermissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserInstallationPermissions.
     */
    distinct?: UserInstallationPermissionScalarFieldEnum | UserInstallationPermissionScalarFieldEnum[]
  }

  /**
   * UserInstallationPermission findFirstOrThrow
   */
  export type UserInstallationPermissionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * Filter, which UserInstallationPermission to fetch.
     */
    where?: UserInstallationPermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserInstallationPermissions to fetch.
     */
    orderBy?: UserInstallationPermissionOrderByWithRelationInput | UserInstallationPermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserInstallationPermissions.
     */
    cursor?: UserInstallationPermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserInstallationPermissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserInstallationPermissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserInstallationPermissions.
     */
    distinct?: UserInstallationPermissionScalarFieldEnum | UserInstallationPermissionScalarFieldEnum[]
  }

  /**
   * UserInstallationPermission findMany
   */
  export type UserInstallationPermissionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * Filter, which UserInstallationPermissions to fetch.
     */
    where?: UserInstallationPermissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserInstallationPermissions to fetch.
     */
    orderBy?: UserInstallationPermissionOrderByWithRelationInput | UserInstallationPermissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserInstallationPermissions.
     */
    cursor?: UserInstallationPermissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserInstallationPermissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserInstallationPermissions.
     */
    skip?: number
    distinct?: UserInstallationPermissionScalarFieldEnum | UserInstallationPermissionScalarFieldEnum[]
  }

  /**
   * UserInstallationPermission create
   */
  export type UserInstallationPermissionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * The data needed to create a UserInstallationPermission.
     */
    data: XOR<UserInstallationPermissionCreateInput, UserInstallationPermissionUncheckedCreateInput>
  }

  /**
   * UserInstallationPermission createMany
   */
  export type UserInstallationPermissionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserInstallationPermissions.
     */
    data: UserInstallationPermissionCreateManyInput | UserInstallationPermissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserInstallationPermission createManyAndReturn
   */
  export type UserInstallationPermissionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * The data used to create many UserInstallationPermissions.
     */
    data: UserInstallationPermissionCreateManyInput | UserInstallationPermissionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserInstallationPermission update
   */
  export type UserInstallationPermissionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * The data needed to update a UserInstallationPermission.
     */
    data: XOR<UserInstallationPermissionUpdateInput, UserInstallationPermissionUncheckedUpdateInput>
    /**
     * Choose, which UserInstallationPermission to update.
     */
    where: UserInstallationPermissionWhereUniqueInput
  }

  /**
   * UserInstallationPermission updateMany
   */
  export type UserInstallationPermissionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserInstallationPermissions.
     */
    data: XOR<UserInstallationPermissionUpdateManyMutationInput, UserInstallationPermissionUncheckedUpdateManyInput>
    /**
     * Filter which UserInstallationPermissions to update
     */
    where?: UserInstallationPermissionWhereInput
    /**
     * Limit how many UserInstallationPermissions to update.
     */
    limit?: number
  }

  /**
   * UserInstallationPermission updateManyAndReturn
   */
  export type UserInstallationPermissionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * The data used to update UserInstallationPermissions.
     */
    data: XOR<UserInstallationPermissionUpdateManyMutationInput, UserInstallationPermissionUncheckedUpdateManyInput>
    /**
     * Filter which UserInstallationPermissions to update
     */
    where?: UserInstallationPermissionWhereInput
    /**
     * Limit how many UserInstallationPermissions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserInstallationPermission upsert
   */
  export type UserInstallationPermissionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * The filter to search for the UserInstallationPermission to update in case it exists.
     */
    where: UserInstallationPermissionWhereUniqueInput
    /**
     * In case the UserInstallationPermission found by the `where` argument doesn't exist, create a new UserInstallationPermission with this data.
     */
    create: XOR<UserInstallationPermissionCreateInput, UserInstallationPermissionUncheckedCreateInput>
    /**
     * In case the UserInstallationPermission was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserInstallationPermissionUpdateInput, UserInstallationPermissionUncheckedUpdateInput>
  }

  /**
   * UserInstallationPermission delete
   */
  export type UserInstallationPermissionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
    /**
     * Filter which UserInstallationPermission to delete.
     */
    where: UserInstallationPermissionWhereUniqueInput
  }

  /**
   * UserInstallationPermission deleteMany
   */
  export type UserInstallationPermissionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserInstallationPermissions to delete
     */
    where?: UserInstallationPermissionWhereInput
    /**
     * Limit how many UserInstallationPermissions to delete.
     */
    limit?: number
  }

  /**
   * UserInstallationPermission.permissions
   */
  export type UserInstallationPermission$permissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permission
     */
    select?: PermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Permission
     */
    omit?: PermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermissionInclude<ExtArgs> | null
    where?: PermissionWhereInput
    orderBy?: PermissionOrderByWithRelationInput | PermissionOrderByWithRelationInput[]
    cursor?: PermissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PermissionScalarFieldEnum | PermissionScalarFieldEnum[]
  }

  /**
   * UserInstallationPermission without action
   */
  export type UserInstallationPermissionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserInstallationPermission
     */
    select?: UserInstallationPermissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserInstallationPermission
     */
    omit?: UserInstallationPermissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInstallationPermissionInclude<ExtArgs> | null
  }


  /**
   * Model Transaction
   */

  export type AggregateTransaction = {
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  export type TransactionAvgAggregateOutputType = {
    amount: number | null
    fromAmount: number | null
    toAmount: number | null
  }

  export type TransactionSumAggregateOutputType = {
    amount: number | null
    fromAmount: number | null
    toAmount: number | null
  }

  export type TransactionMinAggregateOutputType = {
    id: string | null
    txHash: string | null
    category: $Enums.TransactionCategory | null
    amount: number | null
    doneAt: Date | null
    taskId: string | null
    sourceAddress: string | null
    destinationAddress: string | null
    asset: string | null
    assetFrom: string | null
    assetTo: string | null
    fromAmount: number | null
    toAmount: number | null
    installationId: string | null
    userId: string | null
  }

  export type TransactionMaxAggregateOutputType = {
    id: string | null
    txHash: string | null
    category: $Enums.TransactionCategory | null
    amount: number | null
    doneAt: Date | null
    taskId: string | null
    sourceAddress: string | null
    destinationAddress: string | null
    asset: string | null
    assetFrom: string | null
    assetTo: string | null
    fromAmount: number | null
    toAmount: number | null
    installationId: string | null
    userId: string | null
  }

  export type TransactionCountAggregateOutputType = {
    id: number
    txHash: number
    category: number
    amount: number
    doneAt: number
    taskId: number
    sourceAddress: number
    destinationAddress: number
    asset: number
    assetFrom: number
    assetTo: number
    fromAmount: number
    toAmount: number
    installationId: number
    userId: number
    _all: number
  }


  export type TransactionAvgAggregateInputType = {
    amount?: true
    fromAmount?: true
    toAmount?: true
  }

  export type TransactionSumAggregateInputType = {
    amount?: true
    fromAmount?: true
    toAmount?: true
  }

  export type TransactionMinAggregateInputType = {
    id?: true
    txHash?: true
    category?: true
    amount?: true
    doneAt?: true
    taskId?: true
    sourceAddress?: true
    destinationAddress?: true
    asset?: true
    assetFrom?: true
    assetTo?: true
    fromAmount?: true
    toAmount?: true
    installationId?: true
    userId?: true
  }

  export type TransactionMaxAggregateInputType = {
    id?: true
    txHash?: true
    category?: true
    amount?: true
    doneAt?: true
    taskId?: true
    sourceAddress?: true
    destinationAddress?: true
    asset?: true
    assetFrom?: true
    assetTo?: true
    fromAmount?: true
    toAmount?: true
    installationId?: true
    userId?: true
  }

  export type TransactionCountAggregateInputType = {
    id?: true
    txHash?: true
    category?: true
    amount?: true
    doneAt?: true
    taskId?: true
    sourceAddress?: true
    destinationAddress?: true
    asset?: true
    assetFrom?: true
    assetTo?: true
    fromAmount?: true
    toAmount?: true
    installationId?: true
    userId?: true
    _all?: true
  }

  export type TransactionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transaction to aggregate.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Transactions
    **/
    _count?: true | TransactionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TransactionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TransactionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TransactionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TransactionMaxAggregateInputType
  }

  export type GetTransactionAggregateType<T extends TransactionAggregateArgs> = {
        [P in keyof T & keyof AggregateTransaction]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTransaction[P]>
      : GetScalarType<T[P], AggregateTransaction[P]>
  }




  export type TransactionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithAggregationInput | TransactionOrderByWithAggregationInput[]
    by: TransactionScalarFieldEnum[] | TransactionScalarFieldEnum
    having?: TransactionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TransactionCountAggregateInputType | true
    _avg?: TransactionAvgAggregateInputType
    _sum?: TransactionSumAggregateInputType
    _min?: TransactionMinAggregateInputType
    _max?: TransactionMaxAggregateInputType
  }

  export type TransactionGroupByOutputType = {
    id: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt: Date
    taskId: string | null
    sourceAddress: string | null
    destinationAddress: string | null
    asset: string | null
    assetFrom: string | null
    assetTo: string | null
    fromAmount: number | null
    toAmount: number | null
    installationId: string | null
    userId: string | null
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  type GetTransactionGroupByPayload<T extends TransactionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TransactionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TransactionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TransactionGroupByOutputType[P]>
            : GetScalarType<T[P], TransactionGroupByOutputType[P]>
        }
      >
    >


  export type TransactionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    txHash?: boolean
    category?: boolean
    amount?: boolean
    doneAt?: boolean
    taskId?: boolean
    sourceAddress?: boolean
    destinationAddress?: boolean
    asset?: boolean
    assetFrom?: boolean
    assetTo?: boolean
    fromAmount?: boolean
    toAmount?: boolean
    installationId?: boolean
    userId?: boolean
    task?: boolean | Transaction$taskArgs<ExtArgs>
    installation?: boolean | Transaction$installationArgs<ExtArgs>
    user?: boolean | Transaction$userArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    txHash?: boolean
    category?: boolean
    amount?: boolean
    doneAt?: boolean
    taskId?: boolean
    sourceAddress?: boolean
    destinationAddress?: boolean
    asset?: boolean
    assetFrom?: boolean
    assetTo?: boolean
    fromAmount?: boolean
    toAmount?: boolean
    installationId?: boolean
    userId?: boolean
    task?: boolean | Transaction$taskArgs<ExtArgs>
    installation?: boolean | Transaction$installationArgs<ExtArgs>
    user?: boolean | Transaction$userArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    txHash?: boolean
    category?: boolean
    amount?: boolean
    doneAt?: boolean
    taskId?: boolean
    sourceAddress?: boolean
    destinationAddress?: boolean
    asset?: boolean
    assetFrom?: boolean
    assetTo?: boolean
    fromAmount?: boolean
    toAmount?: boolean
    installationId?: boolean
    userId?: boolean
    task?: boolean | Transaction$taskArgs<ExtArgs>
    installation?: boolean | Transaction$installationArgs<ExtArgs>
    user?: boolean | Transaction$userArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectScalar = {
    id?: boolean
    txHash?: boolean
    category?: boolean
    amount?: boolean
    doneAt?: boolean
    taskId?: boolean
    sourceAddress?: boolean
    destinationAddress?: boolean
    asset?: boolean
    assetFrom?: boolean
    assetTo?: boolean
    fromAmount?: boolean
    toAmount?: boolean
    installationId?: boolean
    userId?: boolean
  }

  export type TransactionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "txHash" | "category" | "amount" | "doneAt" | "taskId" | "sourceAddress" | "destinationAddress" | "asset" | "assetFrom" | "assetTo" | "fromAmount" | "toAmount" | "installationId" | "userId", ExtArgs["result"]["transaction"]>
  export type TransactionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | Transaction$taskArgs<ExtArgs>
    installation?: boolean | Transaction$installationArgs<ExtArgs>
    user?: boolean | Transaction$userArgs<ExtArgs>
  }
  export type TransactionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | Transaction$taskArgs<ExtArgs>
    installation?: boolean | Transaction$installationArgs<ExtArgs>
    user?: boolean | Transaction$userArgs<ExtArgs>
  }
  export type TransactionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | Transaction$taskArgs<ExtArgs>
    installation?: boolean | Transaction$installationArgs<ExtArgs>
    user?: boolean | Transaction$userArgs<ExtArgs>
  }

  export type $TransactionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Transaction"
    objects: {
      task: Prisma.$TaskPayload<ExtArgs> | null
      installation: Prisma.$InstallationPayload<ExtArgs> | null
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      txHash: string
      category: $Enums.TransactionCategory
      amount: number
      doneAt: Date
      taskId: string | null
      sourceAddress: string | null
      destinationAddress: string | null
      asset: string | null
      assetFrom: string | null
      assetTo: string | null
      fromAmount: number | null
      toAmount: number | null
      installationId: string | null
      userId: string | null
    }, ExtArgs["result"]["transaction"]>
    composites: {}
  }

  type TransactionGetPayload<S extends boolean | null | undefined | TransactionDefaultArgs> = $Result.GetResult<Prisma.$TransactionPayload, S>

  type TransactionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TransactionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TransactionCountAggregateInputType | true
    }

  export interface TransactionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Transaction'], meta: { name: 'Transaction' } }
    /**
     * Find zero or one Transaction that matches the filter.
     * @param {TransactionFindUniqueArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TransactionFindUniqueArgs>(args: SelectSubset<T, TransactionFindUniqueArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Transaction that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TransactionFindUniqueOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TransactionFindUniqueOrThrowArgs>(args: SelectSubset<T, TransactionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TransactionFindFirstArgs>(args?: SelectSubset<T, TransactionFindFirstArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TransactionFindFirstOrThrowArgs>(args?: SelectSubset<T, TransactionFindFirstOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Transactions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Transactions
     * const transactions = await prisma.transaction.findMany()
     * 
     * // Get first 10 Transactions
     * const transactions = await prisma.transaction.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const transactionWithIdOnly = await prisma.transaction.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TransactionFindManyArgs>(args?: SelectSubset<T, TransactionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Transaction.
     * @param {TransactionCreateArgs} args - Arguments to create a Transaction.
     * @example
     * // Create one Transaction
     * const Transaction = await prisma.transaction.create({
     *   data: {
     *     // ... data to create a Transaction
     *   }
     * })
     * 
     */
    create<T extends TransactionCreateArgs>(args: SelectSubset<T, TransactionCreateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Transactions.
     * @param {TransactionCreateManyArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TransactionCreateManyArgs>(args?: SelectSubset<T, TransactionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Transactions and returns the data saved in the database.
     * @param {TransactionCreateManyAndReturnArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TransactionCreateManyAndReturnArgs>(args?: SelectSubset<T, TransactionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Transaction.
     * @param {TransactionDeleteArgs} args - Arguments to delete one Transaction.
     * @example
     * // Delete one Transaction
     * const Transaction = await prisma.transaction.delete({
     *   where: {
     *     // ... filter to delete one Transaction
     *   }
     * })
     * 
     */
    delete<T extends TransactionDeleteArgs>(args: SelectSubset<T, TransactionDeleteArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Transaction.
     * @param {TransactionUpdateArgs} args - Arguments to update one Transaction.
     * @example
     * // Update one Transaction
     * const transaction = await prisma.transaction.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TransactionUpdateArgs>(args: SelectSubset<T, TransactionUpdateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Transactions.
     * @param {TransactionDeleteManyArgs} args - Arguments to filter Transactions to delete.
     * @example
     * // Delete a few Transactions
     * const { count } = await prisma.transaction.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TransactionDeleteManyArgs>(args?: SelectSubset<T, TransactionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TransactionUpdateManyArgs>(args: SelectSubset<T, TransactionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions and returns the data updated in the database.
     * @param {TransactionUpdateManyAndReturnArgs} args - Arguments to update many Transactions.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TransactionUpdateManyAndReturnArgs>(args: SelectSubset<T, TransactionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Transaction.
     * @param {TransactionUpsertArgs} args - Arguments to update or create a Transaction.
     * @example
     * // Update or create a Transaction
     * const transaction = await prisma.transaction.upsert({
     *   create: {
     *     // ... data to create a Transaction
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Transaction we want to update
     *   }
     * })
     */
    upsert<T extends TransactionUpsertArgs>(args: SelectSubset<T, TransactionUpsertArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionCountArgs} args - Arguments to filter Transactions to count.
     * @example
     * // Count the number of Transactions
     * const count = await prisma.transaction.count({
     *   where: {
     *     // ... the filter for the Transactions we want to count
     *   }
     * })
    **/
    count<T extends TransactionCountArgs>(
      args?: Subset<T, TransactionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TransactionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TransactionAggregateArgs>(args: Subset<T, TransactionAggregateArgs>): Prisma.PrismaPromise<GetTransactionAggregateType<T>>

    /**
     * Group by Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TransactionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TransactionGroupByArgs['orderBy'] }
        : { orderBy?: TransactionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TransactionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTransactionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Transaction model
   */
  readonly fields: TransactionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Transaction.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TransactionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    task<T extends Transaction$taskArgs<ExtArgs> = {}>(args?: Subset<T, Transaction$taskArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    installation<T extends Transaction$installationArgs<ExtArgs> = {}>(args?: Subset<T, Transaction$installationArgs<ExtArgs>>): Prisma__InstallationClient<$Result.GetResult<Prisma.$InstallationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    user<T extends Transaction$userArgs<ExtArgs> = {}>(args?: Subset<T, Transaction$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Transaction model
   */
  interface TransactionFieldRefs {
    readonly id: FieldRef<"Transaction", 'String'>
    readonly txHash: FieldRef<"Transaction", 'String'>
    readonly category: FieldRef<"Transaction", 'TransactionCategory'>
    readonly amount: FieldRef<"Transaction", 'Float'>
    readonly doneAt: FieldRef<"Transaction", 'DateTime'>
    readonly taskId: FieldRef<"Transaction", 'String'>
    readonly sourceAddress: FieldRef<"Transaction", 'String'>
    readonly destinationAddress: FieldRef<"Transaction", 'String'>
    readonly asset: FieldRef<"Transaction", 'String'>
    readonly assetFrom: FieldRef<"Transaction", 'String'>
    readonly assetTo: FieldRef<"Transaction", 'String'>
    readonly fromAmount: FieldRef<"Transaction", 'Float'>
    readonly toAmount: FieldRef<"Transaction", 'Float'>
    readonly installationId: FieldRef<"Transaction", 'String'>
    readonly userId: FieldRef<"Transaction", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Transaction findUnique
   */
  export type TransactionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findUniqueOrThrow
   */
  export type TransactionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findFirst
   */
  export type TransactionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findFirstOrThrow
   */
  export type TransactionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findMany
   */
  export type TransactionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transactions to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction create
   */
  export type TransactionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to create a Transaction.
     */
    data: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
  }

  /**
   * Transaction createMany
   */
  export type TransactionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Transaction createManyAndReturn
   */
  export type TransactionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction update
   */
  export type TransactionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to update a Transaction.
     */
    data: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
    /**
     * Choose, which Transaction to update.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction updateMany
   */
  export type TransactionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
  }

  /**
   * Transaction updateManyAndReturn
   */
  export type TransactionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction upsert
   */
  export type TransactionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The filter to search for the Transaction to update in case it exists.
     */
    where: TransactionWhereUniqueInput
    /**
     * In case the Transaction found by the `where` argument doesn't exist, create a new Transaction with this data.
     */
    create: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
    /**
     * In case the Transaction was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
  }

  /**
   * Transaction delete
   */
  export type TransactionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter which Transaction to delete.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction deleteMany
   */
  export type TransactionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transactions to delete
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to delete.
     */
    limit?: number
  }

  /**
   * Transaction.task
   */
  export type Transaction$taskArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
  }

  /**
   * Transaction.installation
   */
  export type Transaction$installationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installation
     */
    select?: InstallationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installation
     */
    omit?: InstallationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallationInclude<ExtArgs> | null
    where?: InstallationWhereInput
  }

  /**
   * Transaction.user
   */
  export type Transaction$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Transaction without action
   */
  export type TransactionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    userId: 'userId',
    username: 'username',
    walletAddress: 'walletAddress',
    walletSecret: 'walletSecret',
    addressBook: 'addressBook',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const ContributionSummaryScalarFieldEnum: {
    id: 'id',
    tasksCompleted: 'tasksCompleted',
    activeTasks: 'activeTasks',
    totalEarnings: 'totalEarnings',
    userId: 'userId'
  };

  export type ContributionSummaryScalarFieldEnum = (typeof ContributionSummaryScalarFieldEnum)[keyof typeof ContributionSummaryScalarFieldEnum]


  export const SubscriptionPackageScalarFieldEnum: {
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

  export type SubscriptionPackageScalarFieldEnum = (typeof SubscriptionPackageScalarFieldEnum)[keyof typeof SubscriptionPackageScalarFieldEnum]


  export const InstallationScalarFieldEnum: {
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

  export type InstallationScalarFieldEnum = (typeof InstallationScalarFieldEnum)[keyof typeof InstallationScalarFieldEnum]


  export const TaskScalarFieldEnum: {
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

  export type TaskScalarFieldEnum = (typeof TaskScalarFieldEnum)[keyof typeof TaskScalarFieldEnum]


  export const TaskSubmissionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    taskId: 'taskId',
    installationId: 'installationId',
    pullRequest: 'pullRequest',
    attachmentUrl: 'attachmentUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TaskSubmissionScalarFieldEnum = (typeof TaskSubmissionScalarFieldEnum)[keyof typeof TaskSubmissionScalarFieldEnum]


  export const TaskActivityScalarFieldEnum: {
    id: 'id',
    taskId: 'taskId',
    userId: 'userId',
    taskSubmissionId: 'taskSubmissionId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TaskActivityScalarFieldEnum = (typeof TaskActivityScalarFieldEnum)[keyof typeof TaskActivityScalarFieldEnum]


  export const PermissionScalarFieldEnum: {
    code: 'code',
    name: 'name',
    isDefault: 'isDefault',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PermissionScalarFieldEnum = (typeof PermissionScalarFieldEnum)[keyof typeof PermissionScalarFieldEnum]


  export const UserInstallationPermissionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    installationId: 'installationId',
    permissionCodes: 'permissionCodes',
    assignedBy: 'assignedBy',
    assignedAt: 'assignedAt'
  };

  export type UserInstallationPermissionScalarFieldEnum = (typeof UserInstallationPermissionScalarFieldEnum)[keyof typeof UserInstallationPermissionScalarFieldEnum]


  export const TransactionScalarFieldEnum: {
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

  export type TransactionScalarFieldEnum = (typeof TransactionScalarFieldEnum)[keyof typeof TransactionScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Json[]'
   */
  export type ListJsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'TimelineType'
   */
  export type EnumTimelineTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TimelineType'>
    


  /**
   * Reference to a field of type 'TimelineType[]'
   */
  export type ListEnumTimelineTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TimelineType[]'>
    


  /**
   * Reference to a field of type 'TaskStatus'
   */
  export type EnumTaskStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TaskStatus'>
    


  /**
   * Reference to a field of type 'TaskStatus[]'
   */
  export type ListEnumTaskStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TaskStatus[]'>
    


  /**
   * Reference to a field of type 'TransactionCategory'
   */
  export type EnumTransactionCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionCategory'>
    


  /**
   * Reference to a field of type 'TransactionCategory[]'
   */
  export type ListEnumTransactionCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionCategory[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    userId?: StringFilter<"User"> | string
    username?: StringFilter<"User"> | string
    walletAddress?: StringFilter<"User"> | string
    walletSecret?: StringFilter<"User"> | string
    addressBook?: JsonNullableListFilter<"User">
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    contributionSummary?: XOR<ContributionSummaryNullableScalarRelationFilter, ContributionSummaryWhereInput> | null
    createdTasks?: TaskListRelationFilter
    contributedTasks?: TaskListRelationFilter
    installations?: InstallationListRelationFilter
    userInstallationPermissions?: UserInstallationPermissionListRelationFilter
    transactions?: TransactionListRelationFilter
    tasksAppliedFor?: TaskListRelationFilter
    taskSubmissions?: TaskSubmissionListRelationFilter
    taskActivities?: TaskActivityListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    userId?: SortOrder
    username?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    addressBook?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    contributionSummary?: ContributionSummaryOrderByWithRelationInput
    createdTasks?: TaskOrderByRelationAggregateInput
    contributedTasks?: TaskOrderByRelationAggregateInput
    installations?: InstallationOrderByRelationAggregateInput
    userInstallationPermissions?: UserInstallationPermissionOrderByRelationAggregateInput
    transactions?: TransactionOrderByRelationAggregateInput
    tasksAppliedFor?: TaskOrderByRelationAggregateInput
    taskSubmissions?: TaskSubmissionOrderByRelationAggregateInput
    taskActivities?: TaskActivityOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    userId?: string
    username?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    walletAddress?: StringFilter<"User"> | string
    walletSecret?: StringFilter<"User"> | string
    addressBook?: JsonNullableListFilter<"User">
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    contributionSummary?: XOR<ContributionSummaryNullableScalarRelationFilter, ContributionSummaryWhereInput> | null
    createdTasks?: TaskListRelationFilter
    contributedTasks?: TaskListRelationFilter
    installations?: InstallationListRelationFilter
    userInstallationPermissions?: UserInstallationPermissionListRelationFilter
    transactions?: TransactionListRelationFilter
    tasksAppliedFor?: TaskListRelationFilter
    taskSubmissions?: TaskSubmissionListRelationFilter
    taskActivities?: TaskActivityListRelationFilter
  }, "userId" | "username">

  export type UserOrderByWithAggregationInput = {
    userId?: SortOrder
    username?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    addressBook?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    userId?: StringWithAggregatesFilter<"User"> | string
    username?: StringWithAggregatesFilter<"User"> | string
    walletAddress?: StringWithAggregatesFilter<"User"> | string
    walletSecret?: StringWithAggregatesFilter<"User"> | string
    addressBook?: JsonNullableListFilter<"User">
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type ContributionSummaryWhereInput = {
    AND?: ContributionSummaryWhereInput | ContributionSummaryWhereInput[]
    OR?: ContributionSummaryWhereInput[]
    NOT?: ContributionSummaryWhereInput | ContributionSummaryWhereInput[]
    id?: StringFilter<"ContributionSummary"> | string
    tasksCompleted?: IntFilter<"ContributionSummary"> | number
    activeTasks?: IntFilter<"ContributionSummary"> | number
    totalEarnings?: FloatFilter<"ContributionSummary"> | number
    userId?: StringFilter<"ContributionSummary"> | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ContributionSummaryOrderByWithRelationInput = {
    id?: SortOrder
    tasksCompleted?: SortOrder
    activeTasks?: SortOrder
    totalEarnings?: SortOrder
    userId?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type ContributionSummaryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId?: string
    AND?: ContributionSummaryWhereInput | ContributionSummaryWhereInput[]
    OR?: ContributionSummaryWhereInput[]
    NOT?: ContributionSummaryWhereInput | ContributionSummaryWhereInput[]
    tasksCompleted?: IntFilter<"ContributionSummary"> | number
    activeTasks?: IntFilter<"ContributionSummary"> | number
    totalEarnings?: FloatFilter<"ContributionSummary"> | number
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "userId">

  export type ContributionSummaryOrderByWithAggregationInput = {
    id?: SortOrder
    tasksCompleted?: SortOrder
    activeTasks?: SortOrder
    totalEarnings?: SortOrder
    userId?: SortOrder
    _count?: ContributionSummaryCountOrderByAggregateInput
    _avg?: ContributionSummaryAvgOrderByAggregateInput
    _max?: ContributionSummaryMaxOrderByAggregateInput
    _min?: ContributionSummaryMinOrderByAggregateInput
    _sum?: ContributionSummarySumOrderByAggregateInput
  }

  export type ContributionSummaryScalarWhereWithAggregatesInput = {
    AND?: ContributionSummaryScalarWhereWithAggregatesInput | ContributionSummaryScalarWhereWithAggregatesInput[]
    OR?: ContributionSummaryScalarWhereWithAggregatesInput[]
    NOT?: ContributionSummaryScalarWhereWithAggregatesInput | ContributionSummaryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ContributionSummary"> | string
    tasksCompleted?: IntWithAggregatesFilter<"ContributionSummary"> | number
    activeTasks?: IntWithAggregatesFilter<"ContributionSummary"> | number
    totalEarnings?: FloatWithAggregatesFilter<"ContributionSummary"> | number
    userId?: StringWithAggregatesFilter<"ContributionSummary"> | string
  }

  export type SubscriptionPackageWhereInput = {
    AND?: SubscriptionPackageWhereInput | SubscriptionPackageWhereInput[]
    OR?: SubscriptionPackageWhereInput[]
    NOT?: SubscriptionPackageWhereInput | SubscriptionPackageWhereInput[]
    id?: StringFilter<"SubscriptionPackage"> | string
    name?: StringFilter<"SubscriptionPackage"> | string
    description?: StringFilter<"SubscriptionPackage"> | string
    maxTasks?: IntFilter<"SubscriptionPackage"> | number
    maxUsers?: IntFilter<"SubscriptionPackage"> | number
    paid?: BoolFilter<"SubscriptionPackage"> | boolean
    price?: FloatFilter<"SubscriptionPackage"> | number
    active?: BoolFilter<"SubscriptionPackage"> | boolean
    createdAt?: DateTimeFilter<"SubscriptionPackage"> | Date | string
    updatedAt?: DateTimeFilter<"SubscriptionPackage"> | Date | string
    installations?: InstallationListRelationFilter
  }

  export type SubscriptionPackageOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    maxTasks?: SortOrder
    maxUsers?: SortOrder
    paid?: SortOrder
    price?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    installations?: InstallationOrderByRelationAggregateInput
  }

  export type SubscriptionPackageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SubscriptionPackageWhereInput | SubscriptionPackageWhereInput[]
    OR?: SubscriptionPackageWhereInput[]
    NOT?: SubscriptionPackageWhereInput | SubscriptionPackageWhereInput[]
    name?: StringFilter<"SubscriptionPackage"> | string
    description?: StringFilter<"SubscriptionPackage"> | string
    maxTasks?: IntFilter<"SubscriptionPackage"> | number
    maxUsers?: IntFilter<"SubscriptionPackage"> | number
    paid?: BoolFilter<"SubscriptionPackage"> | boolean
    price?: FloatFilter<"SubscriptionPackage"> | number
    active?: BoolFilter<"SubscriptionPackage"> | boolean
    createdAt?: DateTimeFilter<"SubscriptionPackage"> | Date | string
    updatedAt?: DateTimeFilter<"SubscriptionPackage"> | Date | string
    installations?: InstallationListRelationFilter
  }, "id">

  export type SubscriptionPackageOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    maxTasks?: SortOrder
    maxUsers?: SortOrder
    paid?: SortOrder
    price?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SubscriptionPackageCountOrderByAggregateInput
    _avg?: SubscriptionPackageAvgOrderByAggregateInput
    _max?: SubscriptionPackageMaxOrderByAggregateInput
    _min?: SubscriptionPackageMinOrderByAggregateInput
    _sum?: SubscriptionPackageSumOrderByAggregateInput
  }

  export type SubscriptionPackageScalarWhereWithAggregatesInput = {
    AND?: SubscriptionPackageScalarWhereWithAggregatesInput | SubscriptionPackageScalarWhereWithAggregatesInput[]
    OR?: SubscriptionPackageScalarWhereWithAggregatesInput[]
    NOT?: SubscriptionPackageScalarWhereWithAggregatesInput | SubscriptionPackageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SubscriptionPackage"> | string
    name?: StringWithAggregatesFilter<"SubscriptionPackage"> | string
    description?: StringWithAggregatesFilter<"SubscriptionPackage"> | string
    maxTasks?: IntWithAggregatesFilter<"SubscriptionPackage"> | number
    maxUsers?: IntWithAggregatesFilter<"SubscriptionPackage"> | number
    paid?: BoolWithAggregatesFilter<"SubscriptionPackage"> | boolean
    price?: FloatWithAggregatesFilter<"SubscriptionPackage"> | number
    active?: BoolWithAggregatesFilter<"SubscriptionPackage"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"SubscriptionPackage"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SubscriptionPackage"> | Date | string
  }

  export type InstallationWhereInput = {
    AND?: InstallationWhereInput | InstallationWhereInput[]
    OR?: InstallationWhereInput[]
    NOT?: InstallationWhereInput | InstallationWhereInput[]
    id?: StringFilter<"Installation"> | string
    htmlUrl?: StringFilter<"Installation"> | string
    targetId?: IntFilter<"Installation"> | number
    targetType?: StringFilter<"Installation"> | string
    account?: JsonFilter<"Installation">
    walletAddress?: StringFilter<"Installation"> | string
    walletSecret?: StringFilter<"Installation"> | string
    escrowAddress?: StringFilter<"Installation"> | string
    escrowSecret?: StringFilter<"Installation"> | string
    subscriptionPackageId?: StringNullableFilter<"Installation"> | string | null
    createdAt?: DateTimeFilter<"Installation"> | Date | string
    updatedAt?: DateTimeFilter<"Installation"> | Date | string
    subscriptionPackage?: XOR<SubscriptionPackageNullableScalarRelationFilter, SubscriptionPackageWhereInput> | null
    tasks?: TaskListRelationFilter
    users?: UserListRelationFilter
    userInstallationPermissions?: UserInstallationPermissionListRelationFilter
    transactions?: TransactionListRelationFilter
    taskSubmissions?: TaskSubmissionListRelationFilter
  }

  export type InstallationOrderByWithRelationInput = {
    id?: SortOrder
    htmlUrl?: SortOrder
    targetId?: SortOrder
    targetType?: SortOrder
    account?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    escrowAddress?: SortOrder
    escrowSecret?: SortOrder
    subscriptionPackageId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    subscriptionPackage?: SubscriptionPackageOrderByWithRelationInput
    tasks?: TaskOrderByRelationAggregateInput
    users?: UserOrderByRelationAggregateInput
    userInstallationPermissions?: UserInstallationPermissionOrderByRelationAggregateInput
    transactions?: TransactionOrderByRelationAggregateInput
    taskSubmissions?: TaskSubmissionOrderByRelationAggregateInput
  }

  export type InstallationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InstallationWhereInput | InstallationWhereInput[]
    OR?: InstallationWhereInput[]
    NOT?: InstallationWhereInput | InstallationWhereInput[]
    htmlUrl?: StringFilter<"Installation"> | string
    targetId?: IntFilter<"Installation"> | number
    targetType?: StringFilter<"Installation"> | string
    account?: JsonFilter<"Installation">
    walletAddress?: StringFilter<"Installation"> | string
    walletSecret?: StringFilter<"Installation"> | string
    escrowAddress?: StringFilter<"Installation"> | string
    escrowSecret?: StringFilter<"Installation"> | string
    subscriptionPackageId?: StringNullableFilter<"Installation"> | string | null
    createdAt?: DateTimeFilter<"Installation"> | Date | string
    updatedAt?: DateTimeFilter<"Installation"> | Date | string
    subscriptionPackage?: XOR<SubscriptionPackageNullableScalarRelationFilter, SubscriptionPackageWhereInput> | null
    tasks?: TaskListRelationFilter
    users?: UserListRelationFilter
    userInstallationPermissions?: UserInstallationPermissionListRelationFilter
    transactions?: TransactionListRelationFilter
    taskSubmissions?: TaskSubmissionListRelationFilter
  }, "id">

  export type InstallationOrderByWithAggregationInput = {
    id?: SortOrder
    htmlUrl?: SortOrder
    targetId?: SortOrder
    targetType?: SortOrder
    account?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    escrowAddress?: SortOrder
    escrowSecret?: SortOrder
    subscriptionPackageId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: InstallationCountOrderByAggregateInput
    _avg?: InstallationAvgOrderByAggregateInput
    _max?: InstallationMaxOrderByAggregateInput
    _min?: InstallationMinOrderByAggregateInput
    _sum?: InstallationSumOrderByAggregateInput
  }

  export type InstallationScalarWhereWithAggregatesInput = {
    AND?: InstallationScalarWhereWithAggregatesInput | InstallationScalarWhereWithAggregatesInput[]
    OR?: InstallationScalarWhereWithAggregatesInput[]
    NOT?: InstallationScalarWhereWithAggregatesInput | InstallationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Installation"> | string
    htmlUrl?: StringWithAggregatesFilter<"Installation"> | string
    targetId?: IntWithAggregatesFilter<"Installation"> | number
    targetType?: StringWithAggregatesFilter<"Installation"> | string
    account?: JsonWithAggregatesFilter<"Installation">
    walletAddress?: StringWithAggregatesFilter<"Installation"> | string
    walletSecret?: StringWithAggregatesFilter<"Installation"> | string
    escrowAddress?: StringWithAggregatesFilter<"Installation"> | string
    escrowSecret?: StringWithAggregatesFilter<"Installation"> | string
    subscriptionPackageId?: StringNullableWithAggregatesFilter<"Installation"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Installation"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Installation"> | Date | string
  }

  export type TaskWhereInput = {
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    id?: StringFilter<"Task"> | string
    issue?: JsonFilter<"Task">
    timeline?: FloatNullableFilter<"Task"> | number | null
    timelineType?: EnumTimelineTypeNullableFilter<"Task"> | $Enums.TimelineType | null
    bounty?: FloatFilter<"Task"> | number
    status?: EnumTaskStatusFilter<"Task"> | $Enums.TaskStatus
    settled?: BoolFilter<"Task"> | boolean
    acceptedAt?: DateTimeNullableFilter<"Task"> | Date | string | null
    completedAt?: DateTimeNullableFilter<"Task"> | Date | string | null
    creatorId?: StringFilter<"Task"> | string
    contributorId?: StringNullableFilter<"Task"> | string | null
    installationId?: StringFilter<"Task"> | string
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
    applications?: UserListRelationFilter
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
    contributor?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    installation?: XOR<InstallationScalarRelationFilter, InstallationWhereInput>
    transactions?: TransactionListRelationFilter
    taskSubmissions?: TaskSubmissionListRelationFilter
    taskActivities?: TaskActivityListRelationFilter
  }

  export type TaskOrderByWithRelationInput = {
    id?: SortOrder
    issue?: SortOrder
    timeline?: SortOrderInput | SortOrder
    timelineType?: SortOrderInput | SortOrder
    bounty?: SortOrder
    status?: SortOrder
    settled?: SortOrder
    acceptedAt?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    creatorId?: SortOrder
    contributorId?: SortOrderInput | SortOrder
    installationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    applications?: UserOrderByRelationAggregateInput
    creator?: UserOrderByWithRelationInput
    contributor?: UserOrderByWithRelationInput
    installation?: InstallationOrderByWithRelationInput
    transactions?: TransactionOrderByRelationAggregateInput
    taskSubmissions?: TaskSubmissionOrderByRelationAggregateInput
    taskActivities?: TaskActivityOrderByRelationAggregateInput
  }

  export type TaskWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    issue?: JsonFilter<"Task">
    timeline?: FloatNullableFilter<"Task"> | number | null
    timelineType?: EnumTimelineTypeNullableFilter<"Task"> | $Enums.TimelineType | null
    bounty?: FloatFilter<"Task"> | number
    status?: EnumTaskStatusFilter<"Task"> | $Enums.TaskStatus
    settled?: BoolFilter<"Task"> | boolean
    acceptedAt?: DateTimeNullableFilter<"Task"> | Date | string | null
    completedAt?: DateTimeNullableFilter<"Task"> | Date | string | null
    creatorId?: StringFilter<"Task"> | string
    contributorId?: StringNullableFilter<"Task"> | string | null
    installationId?: StringFilter<"Task"> | string
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
    applications?: UserListRelationFilter
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
    contributor?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    installation?: XOR<InstallationScalarRelationFilter, InstallationWhereInput>
    transactions?: TransactionListRelationFilter
    taskSubmissions?: TaskSubmissionListRelationFilter
    taskActivities?: TaskActivityListRelationFilter
  }, "id">

  export type TaskOrderByWithAggregationInput = {
    id?: SortOrder
    issue?: SortOrder
    timeline?: SortOrderInput | SortOrder
    timelineType?: SortOrderInput | SortOrder
    bounty?: SortOrder
    status?: SortOrder
    settled?: SortOrder
    acceptedAt?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    creatorId?: SortOrder
    contributorId?: SortOrderInput | SortOrder
    installationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TaskCountOrderByAggregateInput
    _avg?: TaskAvgOrderByAggregateInput
    _max?: TaskMaxOrderByAggregateInput
    _min?: TaskMinOrderByAggregateInput
    _sum?: TaskSumOrderByAggregateInput
  }

  export type TaskScalarWhereWithAggregatesInput = {
    AND?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    OR?: TaskScalarWhereWithAggregatesInput[]
    NOT?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Task"> | string
    issue?: JsonWithAggregatesFilter<"Task">
    timeline?: FloatNullableWithAggregatesFilter<"Task"> | number | null
    timelineType?: EnumTimelineTypeNullableWithAggregatesFilter<"Task"> | $Enums.TimelineType | null
    bounty?: FloatWithAggregatesFilter<"Task"> | number
    status?: EnumTaskStatusWithAggregatesFilter<"Task"> | $Enums.TaskStatus
    settled?: BoolWithAggregatesFilter<"Task"> | boolean
    acceptedAt?: DateTimeNullableWithAggregatesFilter<"Task"> | Date | string | null
    completedAt?: DateTimeNullableWithAggregatesFilter<"Task"> | Date | string | null
    creatorId?: StringWithAggregatesFilter<"Task"> | string
    contributorId?: StringNullableWithAggregatesFilter<"Task"> | string | null
    installationId?: StringWithAggregatesFilter<"Task"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Task"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Task"> | Date | string
  }

  export type TaskSubmissionWhereInput = {
    AND?: TaskSubmissionWhereInput | TaskSubmissionWhereInput[]
    OR?: TaskSubmissionWhereInput[]
    NOT?: TaskSubmissionWhereInput | TaskSubmissionWhereInput[]
    id?: StringFilter<"TaskSubmission"> | string
    userId?: StringFilter<"TaskSubmission"> | string
    taskId?: StringFilter<"TaskSubmission"> | string
    installationId?: StringFilter<"TaskSubmission"> | string
    pullRequest?: StringFilter<"TaskSubmission"> | string
    attachmentUrl?: StringNullableFilter<"TaskSubmission"> | string | null
    createdAt?: DateTimeFilter<"TaskSubmission"> | Date | string
    updatedAt?: DateTimeFilter<"TaskSubmission"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
    installation?: XOR<InstallationScalarRelationFilter, InstallationWhereInput>
    taskActivities?: TaskActivityListRelationFilter
  }

  export type TaskSubmissionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    installationId?: SortOrder
    pullRequest?: SortOrder
    attachmentUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    task?: TaskOrderByWithRelationInput
    installation?: InstallationOrderByWithRelationInput
    taskActivities?: TaskActivityOrderByRelationAggregateInput
  }

  export type TaskSubmissionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    taskId_userId?: TaskSubmissionTaskIdUserIdCompoundUniqueInput
    AND?: TaskSubmissionWhereInput | TaskSubmissionWhereInput[]
    OR?: TaskSubmissionWhereInput[]
    NOT?: TaskSubmissionWhereInput | TaskSubmissionWhereInput[]
    userId?: StringFilter<"TaskSubmission"> | string
    taskId?: StringFilter<"TaskSubmission"> | string
    installationId?: StringFilter<"TaskSubmission"> | string
    pullRequest?: StringFilter<"TaskSubmission"> | string
    attachmentUrl?: StringNullableFilter<"TaskSubmission"> | string | null
    createdAt?: DateTimeFilter<"TaskSubmission"> | Date | string
    updatedAt?: DateTimeFilter<"TaskSubmission"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
    installation?: XOR<InstallationScalarRelationFilter, InstallationWhereInput>
    taskActivities?: TaskActivityListRelationFilter
  }, "id" | "taskId_userId">

  export type TaskSubmissionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    installationId?: SortOrder
    pullRequest?: SortOrder
    attachmentUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TaskSubmissionCountOrderByAggregateInput
    _max?: TaskSubmissionMaxOrderByAggregateInput
    _min?: TaskSubmissionMinOrderByAggregateInput
  }

  export type TaskSubmissionScalarWhereWithAggregatesInput = {
    AND?: TaskSubmissionScalarWhereWithAggregatesInput | TaskSubmissionScalarWhereWithAggregatesInput[]
    OR?: TaskSubmissionScalarWhereWithAggregatesInput[]
    NOT?: TaskSubmissionScalarWhereWithAggregatesInput | TaskSubmissionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TaskSubmission"> | string
    userId?: StringWithAggregatesFilter<"TaskSubmission"> | string
    taskId?: StringWithAggregatesFilter<"TaskSubmission"> | string
    installationId?: StringWithAggregatesFilter<"TaskSubmission"> | string
    pullRequest?: StringWithAggregatesFilter<"TaskSubmission"> | string
    attachmentUrl?: StringNullableWithAggregatesFilter<"TaskSubmission"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TaskSubmission"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TaskSubmission"> | Date | string
  }

  export type TaskActivityWhereInput = {
    AND?: TaskActivityWhereInput | TaskActivityWhereInput[]
    OR?: TaskActivityWhereInput[]
    NOT?: TaskActivityWhereInput | TaskActivityWhereInput[]
    id?: StringFilter<"TaskActivity"> | string
    taskId?: StringFilter<"TaskActivity"> | string
    userId?: StringNullableFilter<"TaskActivity"> | string | null
    taskSubmissionId?: StringNullableFilter<"TaskActivity"> | string | null
    createdAt?: DateTimeFilter<"TaskActivity"> | Date | string
    updatedAt?: DateTimeFilter<"TaskActivity"> | Date | string
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    taskSubmission?: XOR<TaskSubmissionNullableScalarRelationFilter, TaskSubmissionWhereInput> | null
  }

  export type TaskActivityOrderByWithRelationInput = {
    id?: SortOrder
    taskId?: SortOrder
    userId?: SortOrderInput | SortOrder
    taskSubmissionId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    task?: TaskOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
    taskSubmission?: TaskSubmissionOrderByWithRelationInput
  }

  export type TaskActivityWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TaskActivityWhereInput | TaskActivityWhereInput[]
    OR?: TaskActivityWhereInput[]
    NOT?: TaskActivityWhereInput | TaskActivityWhereInput[]
    taskId?: StringFilter<"TaskActivity"> | string
    userId?: StringNullableFilter<"TaskActivity"> | string | null
    taskSubmissionId?: StringNullableFilter<"TaskActivity"> | string | null
    createdAt?: DateTimeFilter<"TaskActivity"> | Date | string
    updatedAt?: DateTimeFilter<"TaskActivity"> | Date | string
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    taskSubmission?: XOR<TaskSubmissionNullableScalarRelationFilter, TaskSubmissionWhereInput> | null
  }, "id">

  export type TaskActivityOrderByWithAggregationInput = {
    id?: SortOrder
    taskId?: SortOrder
    userId?: SortOrderInput | SortOrder
    taskSubmissionId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TaskActivityCountOrderByAggregateInput
    _max?: TaskActivityMaxOrderByAggregateInput
    _min?: TaskActivityMinOrderByAggregateInput
  }

  export type TaskActivityScalarWhereWithAggregatesInput = {
    AND?: TaskActivityScalarWhereWithAggregatesInput | TaskActivityScalarWhereWithAggregatesInput[]
    OR?: TaskActivityScalarWhereWithAggregatesInput[]
    NOT?: TaskActivityScalarWhereWithAggregatesInput | TaskActivityScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TaskActivity"> | string
    taskId?: StringWithAggregatesFilter<"TaskActivity"> | string
    userId?: StringNullableWithAggregatesFilter<"TaskActivity"> | string | null
    taskSubmissionId?: StringNullableWithAggregatesFilter<"TaskActivity"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TaskActivity"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TaskActivity"> | Date | string
  }

  export type PermissionWhereInput = {
    AND?: PermissionWhereInput | PermissionWhereInput[]
    OR?: PermissionWhereInput[]
    NOT?: PermissionWhereInput | PermissionWhereInput[]
    code?: StringFilter<"Permission"> | string
    name?: StringFilter<"Permission"> | string
    isDefault?: BoolFilter<"Permission"> | boolean
    createdAt?: DateTimeFilter<"Permission"> | Date | string
    updatedAt?: DateTimeFilter<"Permission"> | Date | string
    userInstallationPermissions?: UserInstallationPermissionListRelationFilter
  }

  export type PermissionOrderByWithRelationInput = {
    code?: SortOrder
    name?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userInstallationPermissions?: UserInstallationPermissionOrderByRelationAggregateInput
  }

  export type PermissionWhereUniqueInput = Prisma.AtLeast<{
    code?: string
    AND?: PermissionWhereInput | PermissionWhereInput[]
    OR?: PermissionWhereInput[]
    NOT?: PermissionWhereInput | PermissionWhereInput[]
    name?: StringFilter<"Permission"> | string
    isDefault?: BoolFilter<"Permission"> | boolean
    createdAt?: DateTimeFilter<"Permission"> | Date | string
    updatedAt?: DateTimeFilter<"Permission"> | Date | string
    userInstallationPermissions?: UserInstallationPermissionListRelationFilter
  }, "code">

  export type PermissionOrderByWithAggregationInput = {
    code?: SortOrder
    name?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PermissionCountOrderByAggregateInput
    _max?: PermissionMaxOrderByAggregateInput
    _min?: PermissionMinOrderByAggregateInput
  }

  export type PermissionScalarWhereWithAggregatesInput = {
    AND?: PermissionScalarWhereWithAggregatesInput | PermissionScalarWhereWithAggregatesInput[]
    OR?: PermissionScalarWhereWithAggregatesInput[]
    NOT?: PermissionScalarWhereWithAggregatesInput | PermissionScalarWhereWithAggregatesInput[]
    code?: StringWithAggregatesFilter<"Permission"> | string
    name?: StringWithAggregatesFilter<"Permission"> | string
    isDefault?: BoolWithAggregatesFilter<"Permission"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Permission"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Permission"> | Date | string
  }

  export type UserInstallationPermissionWhereInput = {
    AND?: UserInstallationPermissionWhereInput | UserInstallationPermissionWhereInput[]
    OR?: UserInstallationPermissionWhereInput[]
    NOT?: UserInstallationPermissionWhereInput | UserInstallationPermissionWhereInput[]
    id?: StringFilter<"UserInstallationPermission"> | string
    userId?: StringFilter<"UserInstallationPermission"> | string
    installationId?: StringFilter<"UserInstallationPermission"> | string
    permissionCodes?: StringNullableListFilter<"UserInstallationPermission">
    assignedBy?: StringNullableFilter<"UserInstallationPermission"> | string | null
    assignedAt?: DateTimeFilter<"UserInstallationPermission"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    installation?: XOR<InstallationScalarRelationFilter, InstallationWhereInput>
    permissions?: PermissionListRelationFilter
  }

  export type UserInstallationPermissionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    installationId?: SortOrder
    permissionCodes?: SortOrder
    assignedBy?: SortOrderInput | SortOrder
    assignedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    installation?: InstallationOrderByWithRelationInput
    permissions?: PermissionOrderByRelationAggregateInput
  }

  export type UserInstallationPermissionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_installationId?: UserInstallationPermissionUserIdInstallationIdCompoundUniqueInput
    AND?: UserInstallationPermissionWhereInput | UserInstallationPermissionWhereInput[]
    OR?: UserInstallationPermissionWhereInput[]
    NOT?: UserInstallationPermissionWhereInput | UserInstallationPermissionWhereInput[]
    userId?: StringFilter<"UserInstallationPermission"> | string
    installationId?: StringFilter<"UserInstallationPermission"> | string
    permissionCodes?: StringNullableListFilter<"UserInstallationPermission">
    assignedBy?: StringNullableFilter<"UserInstallationPermission"> | string | null
    assignedAt?: DateTimeFilter<"UserInstallationPermission"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    installation?: XOR<InstallationScalarRelationFilter, InstallationWhereInput>
    permissions?: PermissionListRelationFilter
  }, "id" | "userId_installationId">

  export type UserInstallationPermissionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    installationId?: SortOrder
    permissionCodes?: SortOrder
    assignedBy?: SortOrderInput | SortOrder
    assignedAt?: SortOrder
    _count?: UserInstallationPermissionCountOrderByAggregateInput
    _max?: UserInstallationPermissionMaxOrderByAggregateInput
    _min?: UserInstallationPermissionMinOrderByAggregateInput
  }

  export type UserInstallationPermissionScalarWhereWithAggregatesInput = {
    AND?: UserInstallationPermissionScalarWhereWithAggregatesInput | UserInstallationPermissionScalarWhereWithAggregatesInput[]
    OR?: UserInstallationPermissionScalarWhereWithAggregatesInput[]
    NOT?: UserInstallationPermissionScalarWhereWithAggregatesInput | UserInstallationPermissionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"UserInstallationPermission"> | string
    userId?: StringWithAggregatesFilter<"UserInstallationPermission"> | string
    installationId?: StringWithAggregatesFilter<"UserInstallationPermission"> | string
    permissionCodes?: StringNullableListFilter<"UserInstallationPermission">
    assignedBy?: StringNullableWithAggregatesFilter<"UserInstallationPermission"> | string | null
    assignedAt?: DateTimeWithAggregatesFilter<"UserInstallationPermission"> | Date | string
  }

  export type TransactionWhereInput = {
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    id?: StringFilter<"Transaction"> | string
    txHash?: StringFilter<"Transaction"> | string
    category?: EnumTransactionCategoryFilter<"Transaction"> | $Enums.TransactionCategory
    amount?: FloatFilter<"Transaction"> | number
    doneAt?: DateTimeFilter<"Transaction"> | Date | string
    taskId?: StringNullableFilter<"Transaction"> | string | null
    sourceAddress?: StringNullableFilter<"Transaction"> | string | null
    destinationAddress?: StringNullableFilter<"Transaction"> | string | null
    asset?: StringNullableFilter<"Transaction"> | string | null
    assetFrom?: StringNullableFilter<"Transaction"> | string | null
    assetTo?: StringNullableFilter<"Transaction"> | string | null
    fromAmount?: FloatNullableFilter<"Transaction"> | number | null
    toAmount?: FloatNullableFilter<"Transaction"> | number | null
    installationId?: StringNullableFilter<"Transaction"> | string | null
    userId?: StringNullableFilter<"Transaction"> | string | null
    task?: XOR<TaskNullableScalarRelationFilter, TaskWhereInput> | null
    installation?: XOR<InstallationNullableScalarRelationFilter, InstallationWhereInput> | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type TransactionOrderByWithRelationInput = {
    id?: SortOrder
    txHash?: SortOrder
    category?: SortOrder
    amount?: SortOrder
    doneAt?: SortOrder
    taskId?: SortOrderInput | SortOrder
    sourceAddress?: SortOrderInput | SortOrder
    destinationAddress?: SortOrderInput | SortOrder
    asset?: SortOrderInput | SortOrder
    assetFrom?: SortOrderInput | SortOrder
    assetTo?: SortOrderInput | SortOrder
    fromAmount?: SortOrderInput | SortOrder
    toAmount?: SortOrderInput | SortOrder
    installationId?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    task?: TaskOrderByWithRelationInput
    installation?: InstallationOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type TransactionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    txHash?: StringFilter<"Transaction"> | string
    category?: EnumTransactionCategoryFilter<"Transaction"> | $Enums.TransactionCategory
    amount?: FloatFilter<"Transaction"> | number
    doneAt?: DateTimeFilter<"Transaction"> | Date | string
    taskId?: StringNullableFilter<"Transaction"> | string | null
    sourceAddress?: StringNullableFilter<"Transaction"> | string | null
    destinationAddress?: StringNullableFilter<"Transaction"> | string | null
    asset?: StringNullableFilter<"Transaction"> | string | null
    assetFrom?: StringNullableFilter<"Transaction"> | string | null
    assetTo?: StringNullableFilter<"Transaction"> | string | null
    fromAmount?: FloatNullableFilter<"Transaction"> | number | null
    toAmount?: FloatNullableFilter<"Transaction"> | number | null
    installationId?: StringNullableFilter<"Transaction"> | string | null
    userId?: StringNullableFilter<"Transaction"> | string | null
    task?: XOR<TaskNullableScalarRelationFilter, TaskWhereInput> | null
    installation?: XOR<InstallationNullableScalarRelationFilter, InstallationWhereInput> | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type TransactionOrderByWithAggregationInput = {
    id?: SortOrder
    txHash?: SortOrder
    category?: SortOrder
    amount?: SortOrder
    doneAt?: SortOrder
    taskId?: SortOrderInput | SortOrder
    sourceAddress?: SortOrderInput | SortOrder
    destinationAddress?: SortOrderInput | SortOrder
    asset?: SortOrderInput | SortOrder
    assetFrom?: SortOrderInput | SortOrder
    assetTo?: SortOrderInput | SortOrder
    fromAmount?: SortOrderInput | SortOrder
    toAmount?: SortOrderInput | SortOrder
    installationId?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    _count?: TransactionCountOrderByAggregateInput
    _avg?: TransactionAvgOrderByAggregateInput
    _max?: TransactionMaxOrderByAggregateInput
    _min?: TransactionMinOrderByAggregateInput
    _sum?: TransactionSumOrderByAggregateInput
  }

  export type TransactionScalarWhereWithAggregatesInput = {
    AND?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    OR?: TransactionScalarWhereWithAggregatesInput[]
    NOT?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Transaction"> | string
    txHash?: StringWithAggregatesFilter<"Transaction"> | string
    category?: EnumTransactionCategoryWithAggregatesFilter<"Transaction"> | $Enums.TransactionCategory
    amount?: FloatWithAggregatesFilter<"Transaction"> | number
    doneAt?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
    taskId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    sourceAddress?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    destinationAddress?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    asset?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    assetFrom?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    assetTo?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    fromAmount?: FloatNullableWithAggregatesFilter<"Transaction"> | number | null
    toAmount?: FloatNullableWithAggregatesFilter<"Transaction"> | number | null
    installationId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    userId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
  }

  export type UserCreateInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContributionSummaryCreateInput = {
    id?: string
    tasksCompleted?: number
    activeTasks?: number
    totalEarnings?: number
    user: UserCreateNestedOneWithoutContributionSummaryInput
  }

  export type ContributionSummaryUncheckedCreateInput = {
    id?: string
    tasksCompleted?: number
    activeTasks?: number
    totalEarnings?: number
    userId: string
  }

  export type ContributionSummaryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tasksCompleted?: IntFieldUpdateOperationsInput | number
    activeTasks?: IntFieldUpdateOperationsInput | number
    totalEarnings?: FloatFieldUpdateOperationsInput | number
    user?: UserUpdateOneRequiredWithoutContributionSummaryNestedInput
  }

  export type ContributionSummaryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tasksCompleted?: IntFieldUpdateOperationsInput | number
    activeTasks?: IntFieldUpdateOperationsInput | number
    totalEarnings?: FloatFieldUpdateOperationsInput | number
    userId?: StringFieldUpdateOperationsInput | string
  }

  export type ContributionSummaryCreateManyInput = {
    id?: string
    tasksCompleted?: number
    activeTasks?: number
    totalEarnings?: number
    userId: string
  }

  export type ContributionSummaryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tasksCompleted?: IntFieldUpdateOperationsInput | number
    activeTasks?: IntFieldUpdateOperationsInput | number
    totalEarnings?: FloatFieldUpdateOperationsInput | number
  }

  export type ContributionSummaryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    tasksCompleted?: IntFieldUpdateOperationsInput | number
    activeTasks?: IntFieldUpdateOperationsInput | number
    totalEarnings?: FloatFieldUpdateOperationsInput | number
    userId?: StringFieldUpdateOperationsInput | string
  }

  export type SubscriptionPackageCreateInput = {
    id?: string
    name: string
    description: string
    maxTasks: number
    maxUsers: number
    paid?: boolean
    price: number
    active?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    installations?: InstallationCreateNestedManyWithoutSubscriptionPackageInput
  }

  export type SubscriptionPackageUncheckedCreateInput = {
    id?: string
    name: string
    description: string
    maxTasks: number
    maxUsers: number
    paid?: boolean
    price: number
    active?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    installations?: InstallationUncheckedCreateNestedManyWithoutSubscriptionPackageInput
  }

  export type SubscriptionPackageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    maxTasks?: IntFieldUpdateOperationsInput | number
    maxUsers?: IntFieldUpdateOperationsInput | number
    paid?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    installations?: InstallationUpdateManyWithoutSubscriptionPackageNestedInput
  }

  export type SubscriptionPackageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    maxTasks?: IntFieldUpdateOperationsInput | number
    maxUsers?: IntFieldUpdateOperationsInput | number
    paid?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    installations?: InstallationUncheckedUpdateManyWithoutSubscriptionPackageNestedInput
  }

  export type SubscriptionPackageCreateManyInput = {
    id?: string
    name: string
    description: string
    maxTasks: number
    maxUsers: number
    paid?: boolean
    price: number
    active?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionPackageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    maxTasks?: IntFieldUpdateOperationsInput | number
    maxUsers?: IntFieldUpdateOperationsInput | number
    paid?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionPackageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    maxTasks?: IntFieldUpdateOperationsInput | number
    maxUsers?: IntFieldUpdateOperationsInput | number
    paid?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallationCreateInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptionPackage?: SubscriptionPackageCreateNestedOneWithoutInstallationsInput
    tasks?: TaskCreateNestedManyWithoutInstallationInput
    users?: UserCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutInstallationInput
    transactions?: TransactionCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUncheckedCreateInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskUncheckedCreateNestedManyWithoutInstallationInput
    users?: UserUncheckedCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutInstallationInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptionPackage?: SubscriptionPackageUpdateOneWithoutInstallationsNestedInput
    tasks?: TaskUpdateManyWithoutInstallationNestedInput
    users?: UserUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUncheckedUpdateManyWithoutInstallationNestedInput
    users?: UserUncheckedUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationCreateManyInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstallationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCreateInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserCreateNestedManyWithoutTasksAppliedForInput
    creator: UserCreateNestedOneWithoutCreatedTasksInput
    contributor?: UserCreateNestedOneWithoutContributedTasksInput
    installation: InstallationCreateNestedOneWithoutTasksInput
    transactions?: TransactionCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserUncheckedCreateNestedManyWithoutTasksAppliedForInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUpdateManyWithoutTasksAppliedForNestedInput
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    contributor?: UserUpdateOneWithoutContributedTasksNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTasksNestedInput
    transactions?: TransactionUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type TaskCreateManyInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskSubmissionCreateInput = {
    id?: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTaskSubmissionsInput
    task: TaskCreateNestedOneWithoutTaskSubmissionsInput
    installation: InstallationCreateNestedOneWithoutTaskSubmissionsInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionUncheckedCreateInput = {
    id?: string
    userId: string
    taskId: string
    installationId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    task?: TaskUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionCreateManyInput = {
    id?: string
    userId: string
    taskId: string
    installationId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskSubmissionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskSubmissionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityCreateInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    task: TaskCreateNestedOneWithoutTaskActivitiesInput
    user?: UserCreateNestedOneWithoutTaskActivitiesInput
    taskSubmission?: TaskSubmissionCreateNestedOneWithoutTaskActivitiesInput
  }

  export type TaskActivityUncheckedCreateInput = {
    id?: string
    taskId: string
    userId?: string | null
    taskSubmissionId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    task?: TaskUpdateOneRequiredWithoutTaskActivitiesNestedInput
    user?: UserUpdateOneWithoutTaskActivitiesNestedInput
    taskSubmission?: TaskSubmissionUpdateOneWithoutTaskActivitiesNestedInput
  }

  export type TaskActivityUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    taskSubmissionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityCreateManyInput = {
    id?: string
    taskId: string
    userId?: string | null
    taskSubmissionId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    taskSubmissionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermissionCreateInput = {
    code: string
    name: string
    isDefault: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutPermissionsInput
  }

  export type PermissionUncheckedCreateInput = {
    code: string
    name: string
    isDefault: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutPermissionsInput
  }

  export type PermissionUpdateInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutPermissionsNestedInput
  }

  export type PermissionUncheckedUpdateInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutPermissionsNestedInput
  }

  export type PermissionCreateManyInput = {
    code: string
    name: string
    isDefault: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PermissionUpdateManyMutationInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermissionUncheckedUpdateManyInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserInstallationPermissionCreateInput = {
    id?: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
    user: UserCreateNestedOneWithoutUserInstallationPermissionsInput
    installation: InstallationCreateNestedOneWithoutUserInstallationPermissionsInput
    permissions?: PermissionCreateNestedManyWithoutUserInstallationPermissionsInput
  }

  export type UserInstallationPermissionUncheckedCreateInput = {
    id?: string
    userId: string
    installationId: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
    permissions?: PermissionUncheckedCreateNestedManyWithoutUserInstallationPermissionsInput
  }

  export type UserInstallationPermissionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput
    installation?: InstallationUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput
    permissions?: PermissionUpdateManyWithoutUserInstallationPermissionsNestedInput
  }

  export type UserInstallationPermissionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    permissions?: PermissionUncheckedUpdateManyWithoutUserInstallationPermissionsNestedInput
  }

  export type UserInstallationPermissionCreateManyInput = {
    id?: string
    userId: string
    installationId: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
  }

  export type UserInstallationPermissionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserInstallationPermissionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    task?: TaskCreateNestedOneWithoutTransactionsInput
    installation?: InstallationCreateNestedOneWithoutTransactionsInput
    user?: UserCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    taskId?: string | null
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    installationId?: string | null
    userId?: string | null
  }

  export type TransactionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    task?: TaskUpdateOneWithoutTransactionsNestedInput
    installation?: InstallationUpdateOneWithoutTransactionsNestedInput
    user?: UserUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    installationId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TransactionCreateManyInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    taskId?: string | null
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    installationId?: string | null
    userId?: string | null
  }

  export type TransactionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type TransactionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    installationId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }
  export type JsonNullableListFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableListFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableListFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableListFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableListFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableListFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue[] | ListJsonFieldRefInput<$PrismaModel> | null
    has?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    hasEvery?: InputJsonValue[] | ListJsonFieldRefInput<$PrismaModel>
    hasSome?: InputJsonValue[] | ListJsonFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ContributionSummaryNullableScalarRelationFilter = {
    is?: ContributionSummaryWhereInput | null
    isNot?: ContributionSummaryWhereInput | null
  }

  export type TaskListRelationFilter = {
    every?: TaskWhereInput
    some?: TaskWhereInput
    none?: TaskWhereInput
  }

  export type InstallationListRelationFilter = {
    every?: InstallationWhereInput
    some?: InstallationWhereInput
    none?: InstallationWhereInput
  }

  export type UserInstallationPermissionListRelationFilter = {
    every?: UserInstallationPermissionWhereInput
    some?: UserInstallationPermissionWhereInput
    none?: UserInstallationPermissionWhereInput
  }

  export type TransactionListRelationFilter = {
    every?: TransactionWhereInput
    some?: TransactionWhereInput
    none?: TransactionWhereInput
  }

  export type TaskSubmissionListRelationFilter = {
    every?: TaskSubmissionWhereInput
    some?: TaskSubmissionWhereInput
    none?: TaskSubmissionWhereInput
  }

  export type TaskActivityListRelationFilter = {
    every?: TaskActivityWhereInput
    some?: TaskActivityWhereInput
    none?: TaskActivityWhereInput
  }

  export type TaskOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InstallationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserInstallationPermissionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TransactionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TaskSubmissionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TaskActivityOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    userId?: SortOrder
    username?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    addressBook?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    userId?: SortOrder
    username?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    userId?: SortOrder
    username?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type ContributionSummaryCountOrderByAggregateInput = {
    id?: SortOrder
    tasksCompleted?: SortOrder
    activeTasks?: SortOrder
    totalEarnings?: SortOrder
    userId?: SortOrder
  }

  export type ContributionSummaryAvgOrderByAggregateInput = {
    tasksCompleted?: SortOrder
    activeTasks?: SortOrder
    totalEarnings?: SortOrder
  }

  export type ContributionSummaryMaxOrderByAggregateInput = {
    id?: SortOrder
    tasksCompleted?: SortOrder
    activeTasks?: SortOrder
    totalEarnings?: SortOrder
    userId?: SortOrder
  }

  export type ContributionSummaryMinOrderByAggregateInput = {
    id?: SortOrder
    tasksCompleted?: SortOrder
    activeTasks?: SortOrder
    totalEarnings?: SortOrder
    userId?: SortOrder
  }

  export type ContributionSummarySumOrderByAggregateInput = {
    tasksCompleted?: SortOrder
    activeTasks?: SortOrder
    totalEarnings?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type SubscriptionPackageCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    maxTasks?: SortOrder
    maxUsers?: SortOrder
    paid?: SortOrder
    price?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionPackageAvgOrderByAggregateInput = {
    maxTasks?: SortOrder
    maxUsers?: SortOrder
    price?: SortOrder
  }

  export type SubscriptionPackageMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    maxTasks?: SortOrder
    maxUsers?: SortOrder
    paid?: SortOrder
    price?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionPackageMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    maxTasks?: SortOrder
    maxUsers?: SortOrder
    paid?: SortOrder
    price?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionPackageSumOrderByAggregateInput = {
    maxTasks?: SortOrder
    maxUsers?: SortOrder
    price?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type SubscriptionPackageNullableScalarRelationFilter = {
    is?: SubscriptionPackageWhereInput | null
    isNot?: SubscriptionPackageWhereInput | null
  }

  export type UserListRelationFilter = {
    every?: UserWhereInput
    some?: UserWhereInput
    none?: UserWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InstallationCountOrderByAggregateInput = {
    id?: SortOrder
    htmlUrl?: SortOrder
    targetId?: SortOrder
    targetType?: SortOrder
    account?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    escrowAddress?: SortOrder
    escrowSecret?: SortOrder
    subscriptionPackageId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstallationAvgOrderByAggregateInput = {
    targetId?: SortOrder
  }

  export type InstallationMaxOrderByAggregateInput = {
    id?: SortOrder
    htmlUrl?: SortOrder
    targetId?: SortOrder
    targetType?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    escrowAddress?: SortOrder
    escrowSecret?: SortOrder
    subscriptionPackageId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstallationMinOrderByAggregateInput = {
    id?: SortOrder
    htmlUrl?: SortOrder
    targetId?: SortOrder
    targetType?: SortOrder
    walletAddress?: SortOrder
    walletSecret?: SortOrder
    escrowAddress?: SortOrder
    escrowSecret?: SortOrder
    subscriptionPackageId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstallationSumOrderByAggregateInput = {
    targetId?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type EnumTimelineTypeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.TimelineType | EnumTimelineTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTimelineTypeNullableFilter<$PrismaModel> | $Enums.TimelineType | null
  }

  export type EnumTaskStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusFilter<$PrismaModel> | $Enums.TaskStatus
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type InstallationScalarRelationFilter = {
    is?: InstallationWhereInput
    isNot?: InstallationWhereInput
  }

  export type TaskCountOrderByAggregateInput = {
    id?: SortOrder
    issue?: SortOrder
    timeline?: SortOrder
    timelineType?: SortOrder
    bounty?: SortOrder
    status?: SortOrder
    settled?: SortOrder
    acceptedAt?: SortOrder
    completedAt?: SortOrder
    creatorId?: SortOrder
    contributorId?: SortOrder
    installationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskAvgOrderByAggregateInput = {
    timeline?: SortOrder
    bounty?: SortOrder
  }

  export type TaskMaxOrderByAggregateInput = {
    id?: SortOrder
    timeline?: SortOrder
    timelineType?: SortOrder
    bounty?: SortOrder
    status?: SortOrder
    settled?: SortOrder
    acceptedAt?: SortOrder
    completedAt?: SortOrder
    creatorId?: SortOrder
    contributorId?: SortOrder
    installationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskMinOrderByAggregateInput = {
    id?: SortOrder
    timeline?: SortOrder
    timelineType?: SortOrder
    bounty?: SortOrder
    status?: SortOrder
    settled?: SortOrder
    acceptedAt?: SortOrder
    completedAt?: SortOrder
    creatorId?: SortOrder
    contributorId?: SortOrder
    installationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskSumOrderByAggregateInput = {
    timeline?: SortOrder
    bounty?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type EnumTimelineTypeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TimelineType | EnumTimelineTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTimelineTypeNullableWithAggregatesFilter<$PrismaModel> | $Enums.TimelineType | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumTimelineTypeNullableFilter<$PrismaModel>
    _max?: NestedEnumTimelineTypeNullableFilter<$PrismaModel>
  }

  export type EnumTaskStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusWithAggregatesFilter<$PrismaModel> | $Enums.TaskStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTaskStatusFilter<$PrismaModel>
    _max?: NestedEnumTaskStatusFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type TaskScalarRelationFilter = {
    is?: TaskWhereInput
    isNot?: TaskWhereInput
  }

  export type TaskSubmissionTaskIdUserIdCompoundUniqueInput = {
    taskId: string
    userId: string
  }

  export type TaskSubmissionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    installationId?: SortOrder
    pullRequest?: SortOrder
    attachmentUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskSubmissionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    installationId?: SortOrder
    pullRequest?: SortOrder
    attachmentUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskSubmissionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    installationId?: SortOrder
    pullRequest?: SortOrder
    attachmentUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskSubmissionNullableScalarRelationFilter = {
    is?: TaskSubmissionWhereInput | null
    isNot?: TaskSubmissionWhereInput | null
  }

  export type TaskActivityCountOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    userId?: SortOrder
    taskSubmissionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskActivityMaxOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    userId?: SortOrder
    taskSubmissionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskActivityMinOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    userId?: SortOrder
    taskSubmissionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PermissionCountOrderByAggregateInput = {
    code?: SortOrder
    name?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PermissionMaxOrderByAggregateInput = {
    code?: SortOrder
    name?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PermissionMinOrderByAggregateInput = {
    code?: SortOrder
    name?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type PermissionListRelationFilter = {
    every?: PermissionWhereInput
    some?: PermissionWhereInput
    none?: PermissionWhereInput
  }

  export type PermissionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserInstallationPermissionUserIdInstallationIdCompoundUniqueInput = {
    userId: string
    installationId: string
  }

  export type UserInstallationPermissionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    installationId?: SortOrder
    permissionCodes?: SortOrder
    assignedBy?: SortOrder
    assignedAt?: SortOrder
  }

  export type UserInstallationPermissionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    installationId?: SortOrder
    assignedBy?: SortOrder
    assignedAt?: SortOrder
  }

  export type UserInstallationPermissionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    installationId?: SortOrder
    assignedBy?: SortOrder
    assignedAt?: SortOrder
  }

  export type EnumTransactionCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionCategory | EnumTransactionCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionCategoryFilter<$PrismaModel> | $Enums.TransactionCategory
  }

  export type TaskNullableScalarRelationFilter = {
    is?: TaskWhereInput | null
    isNot?: TaskWhereInput | null
  }

  export type InstallationNullableScalarRelationFilter = {
    is?: InstallationWhereInput | null
    isNot?: InstallationWhereInput | null
  }

  export type TransactionCountOrderByAggregateInput = {
    id?: SortOrder
    txHash?: SortOrder
    category?: SortOrder
    amount?: SortOrder
    doneAt?: SortOrder
    taskId?: SortOrder
    sourceAddress?: SortOrder
    destinationAddress?: SortOrder
    asset?: SortOrder
    assetFrom?: SortOrder
    assetTo?: SortOrder
    fromAmount?: SortOrder
    toAmount?: SortOrder
    installationId?: SortOrder
    userId?: SortOrder
  }

  export type TransactionAvgOrderByAggregateInput = {
    amount?: SortOrder
    fromAmount?: SortOrder
    toAmount?: SortOrder
  }

  export type TransactionMaxOrderByAggregateInput = {
    id?: SortOrder
    txHash?: SortOrder
    category?: SortOrder
    amount?: SortOrder
    doneAt?: SortOrder
    taskId?: SortOrder
    sourceAddress?: SortOrder
    destinationAddress?: SortOrder
    asset?: SortOrder
    assetFrom?: SortOrder
    assetTo?: SortOrder
    fromAmount?: SortOrder
    toAmount?: SortOrder
    installationId?: SortOrder
    userId?: SortOrder
  }

  export type TransactionMinOrderByAggregateInput = {
    id?: SortOrder
    txHash?: SortOrder
    category?: SortOrder
    amount?: SortOrder
    doneAt?: SortOrder
    taskId?: SortOrder
    sourceAddress?: SortOrder
    destinationAddress?: SortOrder
    asset?: SortOrder
    assetFrom?: SortOrder
    assetTo?: SortOrder
    fromAmount?: SortOrder
    toAmount?: SortOrder
    installationId?: SortOrder
    userId?: SortOrder
  }

  export type TransactionSumOrderByAggregateInput = {
    amount?: SortOrder
    fromAmount?: SortOrder
    toAmount?: SortOrder
  }

  export type EnumTransactionCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionCategory | EnumTransactionCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionCategoryWithAggregatesFilter<$PrismaModel> | $Enums.TransactionCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionCategoryFilter<$PrismaModel>
    _max?: NestedEnumTransactionCategoryFilter<$PrismaModel>
  }

  export type UserCreateaddressBookInput = {
    set: InputJsonValue[]
  }

  export type ContributionSummaryCreateNestedOneWithoutUserInput = {
    create?: XOR<ContributionSummaryCreateWithoutUserInput, ContributionSummaryUncheckedCreateWithoutUserInput>
    connectOrCreate?: ContributionSummaryCreateOrConnectWithoutUserInput
    connect?: ContributionSummaryWhereUniqueInput
  }

  export type TaskCreateNestedManyWithoutCreatorInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskCreateNestedManyWithoutContributorInput = {
    create?: XOR<TaskCreateWithoutContributorInput, TaskUncheckedCreateWithoutContributorInput> | TaskCreateWithoutContributorInput[] | TaskUncheckedCreateWithoutContributorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutContributorInput | TaskCreateOrConnectWithoutContributorInput[]
    createMany?: TaskCreateManyContributorInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type InstallationCreateNestedManyWithoutUsersInput = {
    create?: XOR<InstallationCreateWithoutUsersInput, InstallationUncheckedCreateWithoutUsersInput> | InstallationCreateWithoutUsersInput[] | InstallationUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutUsersInput | InstallationCreateOrConnectWithoutUsersInput[]
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
  }

  export type UserInstallationPermissionCreateNestedManyWithoutUserInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutUserInput, UserInstallationPermissionUncheckedCreateWithoutUserInput> | UserInstallationPermissionCreateWithoutUserInput[] | UserInstallationPermissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutUserInput | UserInstallationPermissionCreateOrConnectWithoutUserInput[]
    createMany?: UserInstallationPermissionCreateManyUserInputEnvelope
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
  }

  export type TransactionCreateNestedManyWithoutUserInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TaskCreateNestedManyWithoutApplicationsInput = {
    create?: XOR<TaskCreateWithoutApplicationsInput, TaskUncheckedCreateWithoutApplicationsInput> | TaskCreateWithoutApplicationsInput[] | TaskUncheckedCreateWithoutApplicationsInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutApplicationsInput | TaskCreateOrConnectWithoutApplicationsInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskSubmissionCreateNestedManyWithoutUserInput = {
    create?: XOR<TaskSubmissionCreateWithoutUserInput, TaskSubmissionUncheckedCreateWithoutUserInput> | TaskSubmissionCreateWithoutUserInput[] | TaskSubmissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutUserInput | TaskSubmissionCreateOrConnectWithoutUserInput[]
    createMany?: TaskSubmissionCreateManyUserInputEnvelope
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
  }

  export type TaskActivityCreateNestedManyWithoutUserInput = {
    create?: XOR<TaskActivityCreateWithoutUserInput, TaskActivityUncheckedCreateWithoutUserInput> | TaskActivityCreateWithoutUserInput[] | TaskActivityUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutUserInput | TaskActivityCreateOrConnectWithoutUserInput[]
    createMany?: TaskActivityCreateManyUserInputEnvelope
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
  }

  export type ContributionSummaryUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<ContributionSummaryCreateWithoutUserInput, ContributionSummaryUncheckedCreateWithoutUserInput>
    connectOrCreate?: ContributionSummaryCreateOrConnectWithoutUserInput
    connect?: ContributionSummaryWhereUniqueInput
  }

  export type TaskUncheckedCreateNestedManyWithoutCreatorInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutContributorInput = {
    create?: XOR<TaskCreateWithoutContributorInput, TaskUncheckedCreateWithoutContributorInput> | TaskCreateWithoutContributorInput[] | TaskUncheckedCreateWithoutContributorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutContributorInput | TaskCreateOrConnectWithoutContributorInput[]
    createMany?: TaskCreateManyContributorInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type InstallationUncheckedCreateNestedManyWithoutUsersInput = {
    create?: XOR<InstallationCreateWithoutUsersInput, InstallationUncheckedCreateWithoutUsersInput> | InstallationCreateWithoutUsersInput[] | InstallationUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutUsersInput | InstallationCreateOrConnectWithoutUsersInput[]
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
  }

  export type UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutUserInput, UserInstallationPermissionUncheckedCreateWithoutUserInput> | UserInstallationPermissionCreateWithoutUserInput[] | UserInstallationPermissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutUserInput | UserInstallationPermissionCreateOrConnectWithoutUserInput[]
    createMany?: UserInstallationPermissionCreateManyUserInputEnvelope
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutApplicationsInput = {
    create?: XOR<TaskCreateWithoutApplicationsInput, TaskUncheckedCreateWithoutApplicationsInput> | TaskCreateWithoutApplicationsInput[] | TaskUncheckedCreateWithoutApplicationsInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutApplicationsInput | TaskCreateOrConnectWithoutApplicationsInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskSubmissionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TaskSubmissionCreateWithoutUserInput, TaskSubmissionUncheckedCreateWithoutUserInput> | TaskSubmissionCreateWithoutUserInput[] | TaskSubmissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutUserInput | TaskSubmissionCreateOrConnectWithoutUserInput[]
    createMany?: TaskSubmissionCreateManyUserInputEnvelope
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
  }

  export type TaskActivityUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TaskActivityCreateWithoutUserInput, TaskActivityUncheckedCreateWithoutUserInput> | TaskActivityCreateWithoutUserInput[] | TaskActivityUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutUserInput | TaskActivityCreateOrConnectWithoutUserInput[]
    createMany?: TaskActivityCreateManyUserInputEnvelope
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type UserUpdateaddressBookInput = {
    set?: InputJsonValue[]
    push?: InputJsonValue | InputJsonValue[]
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ContributionSummaryUpdateOneWithoutUserNestedInput = {
    create?: XOR<ContributionSummaryCreateWithoutUserInput, ContributionSummaryUncheckedCreateWithoutUserInput>
    connectOrCreate?: ContributionSummaryCreateOrConnectWithoutUserInput
    upsert?: ContributionSummaryUpsertWithoutUserInput
    disconnect?: ContributionSummaryWhereInput | boolean
    delete?: ContributionSummaryWhereInput | boolean
    connect?: ContributionSummaryWhereUniqueInput
    update?: XOR<XOR<ContributionSummaryUpdateToOneWithWhereWithoutUserInput, ContributionSummaryUpdateWithoutUserInput>, ContributionSummaryUncheckedUpdateWithoutUserInput>
  }

  export type TaskUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutCreatorInput | TaskUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutCreatorInput | TaskUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutCreatorInput | TaskUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskUpdateManyWithoutContributorNestedInput = {
    create?: XOR<TaskCreateWithoutContributorInput, TaskUncheckedCreateWithoutContributorInput> | TaskCreateWithoutContributorInput[] | TaskUncheckedCreateWithoutContributorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutContributorInput | TaskCreateOrConnectWithoutContributorInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutContributorInput | TaskUpsertWithWhereUniqueWithoutContributorInput[]
    createMany?: TaskCreateManyContributorInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutContributorInput | TaskUpdateWithWhereUniqueWithoutContributorInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutContributorInput | TaskUpdateManyWithWhereWithoutContributorInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type InstallationUpdateManyWithoutUsersNestedInput = {
    create?: XOR<InstallationCreateWithoutUsersInput, InstallationUncheckedCreateWithoutUsersInput> | InstallationCreateWithoutUsersInput[] | InstallationUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutUsersInput | InstallationCreateOrConnectWithoutUsersInput[]
    upsert?: InstallationUpsertWithWhereUniqueWithoutUsersInput | InstallationUpsertWithWhereUniqueWithoutUsersInput[]
    set?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    disconnect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    delete?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    update?: InstallationUpdateWithWhereUniqueWithoutUsersInput | InstallationUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: InstallationUpdateManyWithWhereWithoutUsersInput | InstallationUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: InstallationScalarWhereInput | InstallationScalarWhereInput[]
  }

  export type UserInstallationPermissionUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutUserInput, UserInstallationPermissionUncheckedCreateWithoutUserInput> | UserInstallationPermissionCreateWithoutUserInput[] | UserInstallationPermissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutUserInput | UserInstallationPermissionCreateOrConnectWithoutUserInput[]
    upsert?: UserInstallationPermissionUpsertWithWhereUniqueWithoutUserInput | UserInstallationPermissionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserInstallationPermissionCreateManyUserInputEnvelope
    set?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    disconnect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    delete?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    update?: UserInstallationPermissionUpdateWithWhereUniqueWithoutUserInput | UserInstallationPermissionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserInstallationPermissionUpdateManyWithWhereWithoutUserInput | UserInstallationPermissionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
  }

  export type TransactionUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutUserInput | TransactionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutUserInput | TransactionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutUserInput | TransactionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TaskUpdateManyWithoutApplicationsNestedInput = {
    create?: XOR<TaskCreateWithoutApplicationsInput, TaskUncheckedCreateWithoutApplicationsInput> | TaskCreateWithoutApplicationsInput[] | TaskUncheckedCreateWithoutApplicationsInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutApplicationsInput | TaskCreateOrConnectWithoutApplicationsInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutApplicationsInput | TaskUpsertWithWhereUniqueWithoutApplicationsInput[]
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutApplicationsInput | TaskUpdateWithWhereUniqueWithoutApplicationsInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutApplicationsInput | TaskUpdateManyWithWhereWithoutApplicationsInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskSubmissionUpdateManyWithoutUserNestedInput = {
    create?: XOR<TaskSubmissionCreateWithoutUserInput, TaskSubmissionUncheckedCreateWithoutUserInput> | TaskSubmissionCreateWithoutUserInput[] | TaskSubmissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutUserInput | TaskSubmissionCreateOrConnectWithoutUserInput[]
    upsert?: TaskSubmissionUpsertWithWhereUniqueWithoutUserInput | TaskSubmissionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TaskSubmissionCreateManyUserInputEnvelope
    set?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    disconnect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    delete?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    update?: TaskSubmissionUpdateWithWhereUniqueWithoutUserInput | TaskSubmissionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TaskSubmissionUpdateManyWithWhereWithoutUserInput | TaskSubmissionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
  }

  export type TaskActivityUpdateManyWithoutUserNestedInput = {
    create?: XOR<TaskActivityCreateWithoutUserInput, TaskActivityUncheckedCreateWithoutUserInput> | TaskActivityCreateWithoutUserInput[] | TaskActivityUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutUserInput | TaskActivityCreateOrConnectWithoutUserInput[]
    upsert?: TaskActivityUpsertWithWhereUniqueWithoutUserInput | TaskActivityUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TaskActivityCreateManyUserInputEnvelope
    set?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    disconnect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    delete?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    update?: TaskActivityUpdateWithWhereUniqueWithoutUserInput | TaskActivityUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TaskActivityUpdateManyWithWhereWithoutUserInput | TaskActivityUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
  }

  export type ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<ContributionSummaryCreateWithoutUserInput, ContributionSummaryUncheckedCreateWithoutUserInput>
    connectOrCreate?: ContributionSummaryCreateOrConnectWithoutUserInput
    upsert?: ContributionSummaryUpsertWithoutUserInput
    disconnect?: ContributionSummaryWhereInput | boolean
    delete?: ContributionSummaryWhereInput | boolean
    connect?: ContributionSummaryWhereUniqueInput
    update?: XOR<XOR<ContributionSummaryUpdateToOneWithWhereWithoutUserInput, ContributionSummaryUpdateWithoutUserInput>, ContributionSummaryUncheckedUpdateWithoutUserInput>
  }

  export type TaskUncheckedUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutCreatorInput | TaskUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutCreatorInput | TaskUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutCreatorInput | TaskUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskUncheckedUpdateManyWithoutContributorNestedInput = {
    create?: XOR<TaskCreateWithoutContributorInput, TaskUncheckedCreateWithoutContributorInput> | TaskCreateWithoutContributorInput[] | TaskUncheckedCreateWithoutContributorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutContributorInput | TaskCreateOrConnectWithoutContributorInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutContributorInput | TaskUpsertWithWhereUniqueWithoutContributorInput[]
    createMany?: TaskCreateManyContributorInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutContributorInput | TaskUpdateWithWhereUniqueWithoutContributorInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutContributorInput | TaskUpdateManyWithWhereWithoutContributorInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type InstallationUncheckedUpdateManyWithoutUsersNestedInput = {
    create?: XOR<InstallationCreateWithoutUsersInput, InstallationUncheckedCreateWithoutUsersInput> | InstallationCreateWithoutUsersInput[] | InstallationUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutUsersInput | InstallationCreateOrConnectWithoutUsersInput[]
    upsert?: InstallationUpsertWithWhereUniqueWithoutUsersInput | InstallationUpsertWithWhereUniqueWithoutUsersInput[]
    set?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    disconnect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    delete?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    update?: InstallationUpdateWithWhereUniqueWithoutUsersInput | InstallationUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: InstallationUpdateManyWithWhereWithoutUsersInput | InstallationUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: InstallationScalarWhereInput | InstallationScalarWhereInput[]
  }

  export type UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutUserInput, UserInstallationPermissionUncheckedCreateWithoutUserInput> | UserInstallationPermissionCreateWithoutUserInput[] | UserInstallationPermissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutUserInput | UserInstallationPermissionCreateOrConnectWithoutUserInput[]
    upsert?: UserInstallationPermissionUpsertWithWhereUniqueWithoutUserInput | UserInstallationPermissionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserInstallationPermissionCreateManyUserInputEnvelope
    set?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    disconnect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    delete?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    update?: UserInstallationPermissionUpdateWithWhereUniqueWithoutUserInput | UserInstallationPermissionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserInstallationPermissionUpdateManyWithWhereWithoutUserInput | UserInstallationPermissionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutUserInput | TransactionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutUserInput | TransactionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutUserInput | TransactionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TaskUncheckedUpdateManyWithoutApplicationsNestedInput = {
    create?: XOR<TaskCreateWithoutApplicationsInput, TaskUncheckedCreateWithoutApplicationsInput> | TaskCreateWithoutApplicationsInput[] | TaskUncheckedCreateWithoutApplicationsInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutApplicationsInput | TaskCreateOrConnectWithoutApplicationsInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutApplicationsInput | TaskUpsertWithWhereUniqueWithoutApplicationsInput[]
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutApplicationsInput | TaskUpdateWithWhereUniqueWithoutApplicationsInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutApplicationsInput | TaskUpdateManyWithWhereWithoutApplicationsInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TaskSubmissionCreateWithoutUserInput, TaskSubmissionUncheckedCreateWithoutUserInput> | TaskSubmissionCreateWithoutUserInput[] | TaskSubmissionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutUserInput | TaskSubmissionCreateOrConnectWithoutUserInput[]
    upsert?: TaskSubmissionUpsertWithWhereUniqueWithoutUserInput | TaskSubmissionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TaskSubmissionCreateManyUserInputEnvelope
    set?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    disconnect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    delete?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    update?: TaskSubmissionUpdateWithWhereUniqueWithoutUserInput | TaskSubmissionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TaskSubmissionUpdateManyWithWhereWithoutUserInput | TaskSubmissionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
  }

  export type TaskActivityUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TaskActivityCreateWithoutUserInput, TaskActivityUncheckedCreateWithoutUserInput> | TaskActivityCreateWithoutUserInput[] | TaskActivityUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutUserInput | TaskActivityCreateOrConnectWithoutUserInput[]
    upsert?: TaskActivityUpsertWithWhereUniqueWithoutUserInput | TaskActivityUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TaskActivityCreateManyUserInputEnvelope
    set?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    disconnect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    delete?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    update?: TaskActivityUpdateWithWhereUniqueWithoutUserInput | TaskActivityUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TaskActivityUpdateManyWithWhereWithoutUserInput | TaskActivityUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutContributionSummaryInput = {
    create?: XOR<UserCreateWithoutContributionSummaryInput, UserUncheckedCreateWithoutContributionSummaryInput>
    connectOrCreate?: UserCreateOrConnectWithoutContributionSummaryInput
    connect?: UserWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutContributionSummaryNestedInput = {
    create?: XOR<UserCreateWithoutContributionSummaryInput, UserUncheckedCreateWithoutContributionSummaryInput>
    connectOrCreate?: UserCreateOrConnectWithoutContributionSummaryInput
    upsert?: UserUpsertWithoutContributionSummaryInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutContributionSummaryInput, UserUpdateWithoutContributionSummaryInput>, UserUncheckedUpdateWithoutContributionSummaryInput>
  }

  export type InstallationCreateNestedManyWithoutSubscriptionPackageInput = {
    create?: XOR<InstallationCreateWithoutSubscriptionPackageInput, InstallationUncheckedCreateWithoutSubscriptionPackageInput> | InstallationCreateWithoutSubscriptionPackageInput[] | InstallationUncheckedCreateWithoutSubscriptionPackageInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutSubscriptionPackageInput | InstallationCreateOrConnectWithoutSubscriptionPackageInput[]
    createMany?: InstallationCreateManySubscriptionPackageInputEnvelope
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
  }

  export type InstallationUncheckedCreateNestedManyWithoutSubscriptionPackageInput = {
    create?: XOR<InstallationCreateWithoutSubscriptionPackageInput, InstallationUncheckedCreateWithoutSubscriptionPackageInput> | InstallationCreateWithoutSubscriptionPackageInput[] | InstallationUncheckedCreateWithoutSubscriptionPackageInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutSubscriptionPackageInput | InstallationCreateOrConnectWithoutSubscriptionPackageInput[]
    createMany?: InstallationCreateManySubscriptionPackageInputEnvelope
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type InstallationUpdateManyWithoutSubscriptionPackageNestedInput = {
    create?: XOR<InstallationCreateWithoutSubscriptionPackageInput, InstallationUncheckedCreateWithoutSubscriptionPackageInput> | InstallationCreateWithoutSubscriptionPackageInput[] | InstallationUncheckedCreateWithoutSubscriptionPackageInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutSubscriptionPackageInput | InstallationCreateOrConnectWithoutSubscriptionPackageInput[]
    upsert?: InstallationUpsertWithWhereUniqueWithoutSubscriptionPackageInput | InstallationUpsertWithWhereUniqueWithoutSubscriptionPackageInput[]
    createMany?: InstallationCreateManySubscriptionPackageInputEnvelope
    set?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    disconnect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    delete?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    update?: InstallationUpdateWithWhereUniqueWithoutSubscriptionPackageInput | InstallationUpdateWithWhereUniqueWithoutSubscriptionPackageInput[]
    updateMany?: InstallationUpdateManyWithWhereWithoutSubscriptionPackageInput | InstallationUpdateManyWithWhereWithoutSubscriptionPackageInput[]
    deleteMany?: InstallationScalarWhereInput | InstallationScalarWhereInput[]
  }

  export type InstallationUncheckedUpdateManyWithoutSubscriptionPackageNestedInput = {
    create?: XOR<InstallationCreateWithoutSubscriptionPackageInput, InstallationUncheckedCreateWithoutSubscriptionPackageInput> | InstallationCreateWithoutSubscriptionPackageInput[] | InstallationUncheckedCreateWithoutSubscriptionPackageInput[]
    connectOrCreate?: InstallationCreateOrConnectWithoutSubscriptionPackageInput | InstallationCreateOrConnectWithoutSubscriptionPackageInput[]
    upsert?: InstallationUpsertWithWhereUniqueWithoutSubscriptionPackageInput | InstallationUpsertWithWhereUniqueWithoutSubscriptionPackageInput[]
    createMany?: InstallationCreateManySubscriptionPackageInputEnvelope
    set?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    disconnect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    delete?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    connect?: InstallationWhereUniqueInput | InstallationWhereUniqueInput[]
    update?: InstallationUpdateWithWhereUniqueWithoutSubscriptionPackageInput | InstallationUpdateWithWhereUniqueWithoutSubscriptionPackageInput[]
    updateMany?: InstallationUpdateManyWithWhereWithoutSubscriptionPackageInput | InstallationUpdateManyWithWhereWithoutSubscriptionPackageInput[]
    deleteMany?: InstallationScalarWhereInput | InstallationScalarWhereInput[]
  }

  export type SubscriptionPackageCreateNestedOneWithoutInstallationsInput = {
    create?: XOR<SubscriptionPackageCreateWithoutInstallationsInput, SubscriptionPackageUncheckedCreateWithoutInstallationsInput>
    connectOrCreate?: SubscriptionPackageCreateOrConnectWithoutInstallationsInput
    connect?: SubscriptionPackageWhereUniqueInput
  }

  export type TaskCreateNestedManyWithoutInstallationInput = {
    create?: XOR<TaskCreateWithoutInstallationInput, TaskUncheckedCreateWithoutInstallationInput> | TaskCreateWithoutInstallationInput[] | TaskUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutInstallationInput | TaskCreateOrConnectWithoutInstallationInput[]
    createMany?: TaskCreateManyInstallationInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type UserCreateNestedManyWithoutInstallationsInput = {
    create?: XOR<UserCreateWithoutInstallationsInput, UserUncheckedCreateWithoutInstallationsInput> | UserCreateWithoutInstallationsInput[] | UserUncheckedCreateWithoutInstallationsInput[]
    connectOrCreate?: UserCreateOrConnectWithoutInstallationsInput | UserCreateOrConnectWithoutInstallationsInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type UserInstallationPermissionCreateNestedManyWithoutInstallationInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutInstallationInput, UserInstallationPermissionUncheckedCreateWithoutInstallationInput> | UserInstallationPermissionCreateWithoutInstallationInput[] | UserInstallationPermissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutInstallationInput | UserInstallationPermissionCreateOrConnectWithoutInstallationInput[]
    createMany?: UserInstallationPermissionCreateManyInstallationInputEnvelope
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
  }

  export type TransactionCreateNestedManyWithoutInstallationInput = {
    create?: XOR<TransactionCreateWithoutInstallationInput, TransactionUncheckedCreateWithoutInstallationInput> | TransactionCreateWithoutInstallationInput[] | TransactionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallationInput | TransactionCreateOrConnectWithoutInstallationInput[]
    createMany?: TransactionCreateManyInstallationInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TaskSubmissionCreateNestedManyWithoutInstallationInput = {
    create?: XOR<TaskSubmissionCreateWithoutInstallationInput, TaskSubmissionUncheckedCreateWithoutInstallationInput> | TaskSubmissionCreateWithoutInstallationInput[] | TaskSubmissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutInstallationInput | TaskSubmissionCreateOrConnectWithoutInstallationInput[]
    createMany?: TaskSubmissionCreateManyInstallationInputEnvelope
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutInstallationInput = {
    create?: XOR<TaskCreateWithoutInstallationInput, TaskUncheckedCreateWithoutInstallationInput> | TaskCreateWithoutInstallationInput[] | TaskUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutInstallationInput | TaskCreateOrConnectWithoutInstallationInput[]
    createMany?: TaskCreateManyInstallationInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type UserUncheckedCreateNestedManyWithoutInstallationsInput = {
    create?: XOR<UserCreateWithoutInstallationsInput, UserUncheckedCreateWithoutInstallationsInput> | UserCreateWithoutInstallationsInput[] | UserUncheckedCreateWithoutInstallationsInput[]
    connectOrCreate?: UserCreateOrConnectWithoutInstallationsInput | UserCreateOrConnectWithoutInstallationsInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type UserInstallationPermissionUncheckedCreateNestedManyWithoutInstallationInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutInstallationInput, UserInstallationPermissionUncheckedCreateWithoutInstallationInput> | UserInstallationPermissionCreateWithoutInstallationInput[] | UserInstallationPermissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutInstallationInput | UserInstallationPermissionCreateOrConnectWithoutInstallationInput[]
    createMany?: UserInstallationPermissionCreateManyInstallationInputEnvelope
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutInstallationInput = {
    create?: XOR<TransactionCreateWithoutInstallationInput, TransactionUncheckedCreateWithoutInstallationInput> | TransactionCreateWithoutInstallationInput[] | TransactionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallationInput | TransactionCreateOrConnectWithoutInstallationInput[]
    createMany?: TransactionCreateManyInstallationInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TaskSubmissionUncheckedCreateNestedManyWithoutInstallationInput = {
    create?: XOR<TaskSubmissionCreateWithoutInstallationInput, TaskSubmissionUncheckedCreateWithoutInstallationInput> | TaskSubmissionCreateWithoutInstallationInput[] | TaskSubmissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutInstallationInput | TaskSubmissionCreateOrConnectWithoutInstallationInput[]
    createMany?: TaskSubmissionCreateManyInstallationInputEnvelope
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
  }

  export type SubscriptionPackageUpdateOneWithoutInstallationsNestedInput = {
    create?: XOR<SubscriptionPackageCreateWithoutInstallationsInput, SubscriptionPackageUncheckedCreateWithoutInstallationsInput>
    connectOrCreate?: SubscriptionPackageCreateOrConnectWithoutInstallationsInput
    upsert?: SubscriptionPackageUpsertWithoutInstallationsInput
    disconnect?: SubscriptionPackageWhereInput | boolean
    delete?: SubscriptionPackageWhereInput | boolean
    connect?: SubscriptionPackageWhereUniqueInput
    update?: XOR<XOR<SubscriptionPackageUpdateToOneWithWhereWithoutInstallationsInput, SubscriptionPackageUpdateWithoutInstallationsInput>, SubscriptionPackageUncheckedUpdateWithoutInstallationsInput>
  }

  export type TaskUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<TaskCreateWithoutInstallationInput, TaskUncheckedCreateWithoutInstallationInput> | TaskCreateWithoutInstallationInput[] | TaskUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutInstallationInput | TaskCreateOrConnectWithoutInstallationInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutInstallationInput | TaskUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: TaskCreateManyInstallationInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutInstallationInput | TaskUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutInstallationInput | TaskUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type UserUpdateManyWithoutInstallationsNestedInput = {
    create?: XOR<UserCreateWithoutInstallationsInput, UserUncheckedCreateWithoutInstallationsInput> | UserCreateWithoutInstallationsInput[] | UserUncheckedCreateWithoutInstallationsInput[]
    connectOrCreate?: UserCreateOrConnectWithoutInstallationsInput | UserCreateOrConnectWithoutInstallationsInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutInstallationsInput | UserUpsertWithWhereUniqueWithoutInstallationsInput[]
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutInstallationsInput | UserUpdateWithWhereUniqueWithoutInstallationsInput[]
    updateMany?: UserUpdateManyWithWhereWithoutInstallationsInput | UserUpdateManyWithWhereWithoutInstallationsInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type UserInstallationPermissionUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutInstallationInput, UserInstallationPermissionUncheckedCreateWithoutInstallationInput> | UserInstallationPermissionCreateWithoutInstallationInput[] | UserInstallationPermissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutInstallationInput | UserInstallationPermissionCreateOrConnectWithoutInstallationInput[]
    upsert?: UserInstallationPermissionUpsertWithWhereUniqueWithoutInstallationInput | UserInstallationPermissionUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: UserInstallationPermissionCreateManyInstallationInputEnvelope
    set?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    disconnect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    delete?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    update?: UserInstallationPermissionUpdateWithWhereUniqueWithoutInstallationInput | UserInstallationPermissionUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: UserInstallationPermissionUpdateManyWithWhereWithoutInstallationInput | UserInstallationPermissionUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
  }

  export type TransactionUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<TransactionCreateWithoutInstallationInput, TransactionUncheckedCreateWithoutInstallationInput> | TransactionCreateWithoutInstallationInput[] | TransactionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallationInput | TransactionCreateOrConnectWithoutInstallationInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutInstallationInput | TransactionUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: TransactionCreateManyInstallationInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutInstallationInput | TransactionUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutInstallationInput | TransactionUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TaskSubmissionUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<TaskSubmissionCreateWithoutInstallationInput, TaskSubmissionUncheckedCreateWithoutInstallationInput> | TaskSubmissionCreateWithoutInstallationInput[] | TaskSubmissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutInstallationInput | TaskSubmissionCreateOrConnectWithoutInstallationInput[]
    upsert?: TaskSubmissionUpsertWithWhereUniqueWithoutInstallationInput | TaskSubmissionUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: TaskSubmissionCreateManyInstallationInputEnvelope
    set?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    disconnect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    delete?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    update?: TaskSubmissionUpdateWithWhereUniqueWithoutInstallationInput | TaskSubmissionUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: TaskSubmissionUpdateManyWithWhereWithoutInstallationInput | TaskSubmissionUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type TaskUncheckedUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<TaskCreateWithoutInstallationInput, TaskUncheckedCreateWithoutInstallationInput> | TaskCreateWithoutInstallationInput[] | TaskUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutInstallationInput | TaskCreateOrConnectWithoutInstallationInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutInstallationInput | TaskUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: TaskCreateManyInstallationInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutInstallationInput | TaskUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutInstallationInput | TaskUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type UserUncheckedUpdateManyWithoutInstallationsNestedInput = {
    create?: XOR<UserCreateWithoutInstallationsInput, UserUncheckedCreateWithoutInstallationsInput> | UserCreateWithoutInstallationsInput[] | UserUncheckedCreateWithoutInstallationsInput[]
    connectOrCreate?: UserCreateOrConnectWithoutInstallationsInput | UserCreateOrConnectWithoutInstallationsInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutInstallationsInput | UserUpsertWithWhereUniqueWithoutInstallationsInput[]
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutInstallationsInput | UserUpdateWithWhereUniqueWithoutInstallationsInput[]
    updateMany?: UserUpdateManyWithWhereWithoutInstallationsInput | UserUpdateManyWithWhereWithoutInstallationsInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type UserInstallationPermissionUncheckedUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutInstallationInput, UserInstallationPermissionUncheckedCreateWithoutInstallationInput> | UserInstallationPermissionCreateWithoutInstallationInput[] | UserInstallationPermissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutInstallationInput | UserInstallationPermissionCreateOrConnectWithoutInstallationInput[]
    upsert?: UserInstallationPermissionUpsertWithWhereUniqueWithoutInstallationInput | UserInstallationPermissionUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: UserInstallationPermissionCreateManyInstallationInputEnvelope
    set?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    disconnect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    delete?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    update?: UserInstallationPermissionUpdateWithWhereUniqueWithoutInstallationInput | UserInstallationPermissionUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: UserInstallationPermissionUpdateManyWithWhereWithoutInstallationInput | UserInstallationPermissionUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<TransactionCreateWithoutInstallationInput, TransactionUncheckedCreateWithoutInstallationInput> | TransactionCreateWithoutInstallationInput[] | TransactionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallationInput | TransactionCreateOrConnectWithoutInstallationInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutInstallationInput | TransactionUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: TransactionCreateManyInstallationInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutInstallationInput | TransactionUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutInstallationInput | TransactionUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TaskSubmissionUncheckedUpdateManyWithoutInstallationNestedInput = {
    create?: XOR<TaskSubmissionCreateWithoutInstallationInput, TaskSubmissionUncheckedCreateWithoutInstallationInput> | TaskSubmissionCreateWithoutInstallationInput[] | TaskSubmissionUncheckedCreateWithoutInstallationInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutInstallationInput | TaskSubmissionCreateOrConnectWithoutInstallationInput[]
    upsert?: TaskSubmissionUpsertWithWhereUniqueWithoutInstallationInput | TaskSubmissionUpsertWithWhereUniqueWithoutInstallationInput[]
    createMany?: TaskSubmissionCreateManyInstallationInputEnvelope
    set?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    disconnect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    delete?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    update?: TaskSubmissionUpdateWithWhereUniqueWithoutInstallationInput | TaskSubmissionUpdateWithWhereUniqueWithoutInstallationInput[]
    updateMany?: TaskSubmissionUpdateManyWithWhereWithoutInstallationInput | TaskSubmissionUpdateManyWithWhereWithoutInstallationInput[]
    deleteMany?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
  }

  export type UserCreateNestedManyWithoutTasksAppliedForInput = {
    create?: XOR<UserCreateWithoutTasksAppliedForInput, UserUncheckedCreateWithoutTasksAppliedForInput> | UserCreateWithoutTasksAppliedForInput[] | UserUncheckedCreateWithoutTasksAppliedForInput[]
    connectOrCreate?: UserCreateOrConnectWithoutTasksAppliedForInput | UserCreateOrConnectWithoutTasksAppliedForInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutCreatedTasksInput = {
    create?: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedTasksInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutContributedTasksInput = {
    create?: XOR<UserCreateWithoutContributedTasksInput, UserUncheckedCreateWithoutContributedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutContributedTasksInput
    connect?: UserWhereUniqueInput
  }

  export type InstallationCreateNestedOneWithoutTasksInput = {
    create?: XOR<InstallationCreateWithoutTasksInput, InstallationUncheckedCreateWithoutTasksInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutTasksInput
    connect?: InstallationWhereUniqueInput
  }

  export type TransactionCreateNestedManyWithoutTaskInput = {
    create?: XOR<TransactionCreateWithoutTaskInput, TransactionUncheckedCreateWithoutTaskInput> | TransactionCreateWithoutTaskInput[] | TransactionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutTaskInput | TransactionCreateOrConnectWithoutTaskInput[]
    createMany?: TransactionCreateManyTaskInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TaskSubmissionCreateNestedManyWithoutTaskInput = {
    create?: XOR<TaskSubmissionCreateWithoutTaskInput, TaskSubmissionUncheckedCreateWithoutTaskInput> | TaskSubmissionCreateWithoutTaskInput[] | TaskSubmissionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutTaskInput | TaskSubmissionCreateOrConnectWithoutTaskInput[]
    createMany?: TaskSubmissionCreateManyTaskInputEnvelope
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
  }

  export type TaskActivityCreateNestedManyWithoutTaskInput = {
    create?: XOR<TaskActivityCreateWithoutTaskInput, TaskActivityUncheckedCreateWithoutTaskInput> | TaskActivityCreateWithoutTaskInput[] | TaskActivityUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskInput | TaskActivityCreateOrConnectWithoutTaskInput[]
    createMany?: TaskActivityCreateManyTaskInputEnvelope
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
  }

  export type UserUncheckedCreateNestedManyWithoutTasksAppliedForInput = {
    create?: XOR<UserCreateWithoutTasksAppliedForInput, UserUncheckedCreateWithoutTasksAppliedForInput> | UserCreateWithoutTasksAppliedForInput[] | UserUncheckedCreateWithoutTasksAppliedForInput[]
    connectOrCreate?: UserCreateOrConnectWithoutTasksAppliedForInput | UserCreateOrConnectWithoutTasksAppliedForInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutTaskInput = {
    create?: XOR<TransactionCreateWithoutTaskInput, TransactionUncheckedCreateWithoutTaskInput> | TransactionCreateWithoutTaskInput[] | TransactionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutTaskInput | TransactionCreateOrConnectWithoutTaskInput[]
    createMany?: TransactionCreateManyTaskInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput = {
    create?: XOR<TaskSubmissionCreateWithoutTaskInput, TaskSubmissionUncheckedCreateWithoutTaskInput> | TaskSubmissionCreateWithoutTaskInput[] | TaskSubmissionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutTaskInput | TaskSubmissionCreateOrConnectWithoutTaskInput[]
    createMany?: TaskSubmissionCreateManyTaskInputEnvelope
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
  }

  export type TaskActivityUncheckedCreateNestedManyWithoutTaskInput = {
    create?: XOR<TaskActivityCreateWithoutTaskInput, TaskActivityUncheckedCreateWithoutTaskInput> | TaskActivityCreateWithoutTaskInput[] | TaskActivityUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskInput | TaskActivityCreateOrConnectWithoutTaskInput[]
    createMany?: TaskActivityCreateManyTaskInputEnvelope
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableEnumTimelineTypeFieldUpdateOperationsInput = {
    set?: $Enums.TimelineType | null
  }

  export type EnumTaskStatusFieldUpdateOperationsInput = {
    set?: $Enums.TaskStatus
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type UserUpdateManyWithoutTasksAppliedForNestedInput = {
    create?: XOR<UserCreateWithoutTasksAppliedForInput, UserUncheckedCreateWithoutTasksAppliedForInput> | UserCreateWithoutTasksAppliedForInput[] | UserUncheckedCreateWithoutTasksAppliedForInput[]
    connectOrCreate?: UserCreateOrConnectWithoutTasksAppliedForInput | UserCreateOrConnectWithoutTasksAppliedForInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutTasksAppliedForInput | UserUpsertWithWhereUniqueWithoutTasksAppliedForInput[]
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutTasksAppliedForInput | UserUpdateWithWhereUniqueWithoutTasksAppliedForInput[]
    updateMany?: UserUpdateManyWithWhereWithoutTasksAppliedForInput | UserUpdateManyWithWhereWithoutTasksAppliedForInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutCreatedTasksNestedInput = {
    create?: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedTasksInput
    upsert?: UserUpsertWithoutCreatedTasksInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCreatedTasksInput, UserUpdateWithoutCreatedTasksInput>, UserUncheckedUpdateWithoutCreatedTasksInput>
  }

  export type UserUpdateOneWithoutContributedTasksNestedInput = {
    create?: XOR<UserCreateWithoutContributedTasksInput, UserUncheckedCreateWithoutContributedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutContributedTasksInput
    upsert?: UserUpsertWithoutContributedTasksInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutContributedTasksInput, UserUpdateWithoutContributedTasksInput>, UserUncheckedUpdateWithoutContributedTasksInput>
  }

  export type InstallationUpdateOneRequiredWithoutTasksNestedInput = {
    create?: XOR<InstallationCreateWithoutTasksInput, InstallationUncheckedCreateWithoutTasksInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutTasksInput
    upsert?: InstallationUpsertWithoutTasksInput
    connect?: InstallationWhereUniqueInput
    update?: XOR<XOR<InstallationUpdateToOneWithWhereWithoutTasksInput, InstallationUpdateWithoutTasksInput>, InstallationUncheckedUpdateWithoutTasksInput>
  }

  export type TransactionUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TransactionCreateWithoutTaskInput, TransactionUncheckedCreateWithoutTaskInput> | TransactionCreateWithoutTaskInput[] | TransactionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutTaskInput | TransactionCreateOrConnectWithoutTaskInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutTaskInput | TransactionUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TransactionCreateManyTaskInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutTaskInput | TransactionUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutTaskInput | TransactionUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TaskSubmissionUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TaskSubmissionCreateWithoutTaskInput, TaskSubmissionUncheckedCreateWithoutTaskInput> | TaskSubmissionCreateWithoutTaskInput[] | TaskSubmissionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutTaskInput | TaskSubmissionCreateOrConnectWithoutTaskInput[]
    upsert?: TaskSubmissionUpsertWithWhereUniqueWithoutTaskInput | TaskSubmissionUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TaskSubmissionCreateManyTaskInputEnvelope
    set?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    disconnect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    delete?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    update?: TaskSubmissionUpdateWithWhereUniqueWithoutTaskInput | TaskSubmissionUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TaskSubmissionUpdateManyWithWhereWithoutTaskInput | TaskSubmissionUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
  }

  export type TaskActivityUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TaskActivityCreateWithoutTaskInput, TaskActivityUncheckedCreateWithoutTaskInput> | TaskActivityCreateWithoutTaskInput[] | TaskActivityUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskInput | TaskActivityCreateOrConnectWithoutTaskInput[]
    upsert?: TaskActivityUpsertWithWhereUniqueWithoutTaskInput | TaskActivityUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TaskActivityCreateManyTaskInputEnvelope
    set?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    disconnect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    delete?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    update?: TaskActivityUpdateWithWhereUniqueWithoutTaskInput | TaskActivityUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TaskActivityUpdateManyWithWhereWithoutTaskInput | TaskActivityUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
  }

  export type UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput = {
    create?: XOR<UserCreateWithoutTasksAppliedForInput, UserUncheckedCreateWithoutTasksAppliedForInput> | UserCreateWithoutTasksAppliedForInput[] | UserUncheckedCreateWithoutTasksAppliedForInput[]
    connectOrCreate?: UserCreateOrConnectWithoutTasksAppliedForInput | UserCreateOrConnectWithoutTasksAppliedForInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutTasksAppliedForInput | UserUpsertWithWhereUniqueWithoutTasksAppliedForInput[]
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutTasksAppliedForInput | UserUpdateWithWhereUniqueWithoutTasksAppliedForInput[]
    updateMany?: UserUpdateManyWithWhereWithoutTasksAppliedForInput | UserUpdateManyWithWhereWithoutTasksAppliedForInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TransactionCreateWithoutTaskInput, TransactionUncheckedCreateWithoutTaskInput> | TransactionCreateWithoutTaskInput[] | TransactionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutTaskInput | TransactionCreateOrConnectWithoutTaskInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutTaskInput | TransactionUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TransactionCreateManyTaskInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutTaskInput | TransactionUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutTaskInput | TransactionUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TaskSubmissionCreateWithoutTaskInput, TaskSubmissionUncheckedCreateWithoutTaskInput> | TaskSubmissionCreateWithoutTaskInput[] | TaskSubmissionUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutTaskInput | TaskSubmissionCreateOrConnectWithoutTaskInput[]
    upsert?: TaskSubmissionUpsertWithWhereUniqueWithoutTaskInput | TaskSubmissionUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TaskSubmissionCreateManyTaskInputEnvelope
    set?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    disconnect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    delete?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    connect?: TaskSubmissionWhereUniqueInput | TaskSubmissionWhereUniqueInput[]
    update?: TaskSubmissionUpdateWithWhereUniqueWithoutTaskInput | TaskSubmissionUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TaskSubmissionUpdateManyWithWhereWithoutTaskInput | TaskSubmissionUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
  }

  export type TaskActivityUncheckedUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TaskActivityCreateWithoutTaskInput, TaskActivityUncheckedCreateWithoutTaskInput> | TaskActivityCreateWithoutTaskInput[] | TaskActivityUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskInput | TaskActivityCreateOrConnectWithoutTaskInput[]
    upsert?: TaskActivityUpsertWithWhereUniqueWithoutTaskInput | TaskActivityUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TaskActivityCreateManyTaskInputEnvelope
    set?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    disconnect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    delete?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    update?: TaskActivityUpdateWithWhereUniqueWithoutTaskInput | TaskActivityUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TaskActivityUpdateManyWithWhereWithoutTaskInput | TaskActivityUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutTaskSubmissionsInput = {
    create?: XOR<UserCreateWithoutTaskSubmissionsInput, UserUncheckedCreateWithoutTaskSubmissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTaskSubmissionsInput
    connect?: UserWhereUniqueInput
  }

  export type TaskCreateNestedOneWithoutTaskSubmissionsInput = {
    create?: XOR<TaskCreateWithoutTaskSubmissionsInput, TaskUncheckedCreateWithoutTaskSubmissionsInput>
    connectOrCreate?: TaskCreateOrConnectWithoutTaskSubmissionsInput
    connect?: TaskWhereUniqueInput
  }

  export type InstallationCreateNestedOneWithoutTaskSubmissionsInput = {
    create?: XOR<InstallationCreateWithoutTaskSubmissionsInput, InstallationUncheckedCreateWithoutTaskSubmissionsInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutTaskSubmissionsInput
    connect?: InstallationWhereUniqueInput
  }

  export type TaskActivityCreateNestedManyWithoutTaskSubmissionInput = {
    create?: XOR<TaskActivityCreateWithoutTaskSubmissionInput, TaskActivityUncheckedCreateWithoutTaskSubmissionInput> | TaskActivityCreateWithoutTaskSubmissionInput[] | TaskActivityUncheckedCreateWithoutTaskSubmissionInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskSubmissionInput | TaskActivityCreateOrConnectWithoutTaskSubmissionInput[]
    createMany?: TaskActivityCreateManyTaskSubmissionInputEnvelope
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
  }

  export type TaskActivityUncheckedCreateNestedManyWithoutTaskSubmissionInput = {
    create?: XOR<TaskActivityCreateWithoutTaskSubmissionInput, TaskActivityUncheckedCreateWithoutTaskSubmissionInput> | TaskActivityCreateWithoutTaskSubmissionInput[] | TaskActivityUncheckedCreateWithoutTaskSubmissionInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskSubmissionInput | TaskActivityCreateOrConnectWithoutTaskSubmissionInput[]
    createMany?: TaskActivityCreateManyTaskSubmissionInputEnvelope
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutTaskSubmissionsNestedInput = {
    create?: XOR<UserCreateWithoutTaskSubmissionsInput, UserUncheckedCreateWithoutTaskSubmissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTaskSubmissionsInput
    upsert?: UserUpsertWithoutTaskSubmissionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTaskSubmissionsInput, UserUpdateWithoutTaskSubmissionsInput>, UserUncheckedUpdateWithoutTaskSubmissionsInput>
  }

  export type TaskUpdateOneRequiredWithoutTaskSubmissionsNestedInput = {
    create?: XOR<TaskCreateWithoutTaskSubmissionsInput, TaskUncheckedCreateWithoutTaskSubmissionsInput>
    connectOrCreate?: TaskCreateOrConnectWithoutTaskSubmissionsInput
    upsert?: TaskUpsertWithoutTaskSubmissionsInput
    connect?: TaskWhereUniqueInput
    update?: XOR<XOR<TaskUpdateToOneWithWhereWithoutTaskSubmissionsInput, TaskUpdateWithoutTaskSubmissionsInput>, TaskUncheckedUpdateWithoutTaskSubmissionsInput>
  }

  export type InstallationUpdateOneRequiredWithoutTaskSubmissionsNestedInput = {
    create?: XOR<InstallationCreateWithoutTaskSubmissionsInput, InstallationUncheckedCreateWithoutTaskSubmissionsInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutTaskSubmissionsInput
    upsert?: InstallationUpsertWithoutTaskSubmissionsInput
    connect?: InstallationWhereUniqueInput
    update?: XOR<XOR<InstallationUpdateToOneWithWhereWithoutTaskSubmissionsInput, InstallationUpdateWithoutTaskSubmissionsInput>, InstallationUncheckedUpdateWithoutTaskSubmissionsInput>
  }

  export type TaskActivityUpdateManyWithoutTaskSubmissionNestedInput = {
    create?: XOR<TaskActivityCreateWithoutTaskSubmissionInput, TaskActivityUncheckedCreateWithoutTaskSubmissionInput> | TaskActivityCreateWithoutTaskSubmissionInput[] | TaskActivityUncheckedCreateWithoutTaskSubmissionInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskSubmissionInput | TaskActivityCreateOrConnectWithoutTaskSubmissionInput[]
    upsert?: TaskActivityUpsertWithWhereUniqueWithoutTaskSubmissionInput | TaskActivityUpsertWithWhereUniqueWithoutTaskSubmissionInput[]
    createMany?: TaskActivityCreateManyTaskSubmissionInputEnvelope
    set?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    disconnect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    delete?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    update?: TaskActivityUpdateWithWhereUniqueWithoutTaskSubmissionInput | TaskActivityUpdateWithWhereUniqueWithoutTaskSubmissionInput[]
    updateMany?: TaskActivityUpdateManyWithWhereWithoutTaskSubmissionInput | TaskActivityUpdateManyWithWhereWithoutTaskSubmissionInput[]
    deleteMany?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
  }

  export type TaskActivityUncheckedUpdateManyWithoutTaskSubmissionNestedInput = {
    create?: XOR<TaskActivityCreateWithoutTaskSubmissionInput, TaskActivityUncheckedCreateWithoutTaskSubmissionInput> | TaskActivityCreateWithoutTaskSubmissionInput[] | TaskActivityUncheckedCreateWithoutTaskSubmissionInput[]
    connectOrCreate?: TaskActivityCreateOrConnectWithoutTaskSubmissionInput | TaskActivityCreateOrConnectWithoutTaskSubmissionInput[]
    upsert?: TaskActivityUpsertWithWhereUniqueWithoutTaskSubmissionInput | TaskActivityUpsertWithWhereUniqueWithoutTaskSubmissionInput[]
    createMany?: TaskActivityCreateManyTaskSubmissionInputEnvelope
    set?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    disconnect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    delete?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    connect?: TaskActivityWhereUniqueInput | TaskActivityWhereUniqueInput[]
    update?: TaskActivityUpdateWithWhereUniqueWithoutTaskSubmissionInput | TaskActivityUpdateWithWhereUniqueWithoutTaskSubmissionInput[]
    updateMany?: TaskActivityUpdateManyWithWhereWithoutTaskSubmissionInput | TaskActivityUpdateManyWithWhereWithoutTaskSubmissionInput[]
    deleteMany?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
  }

  export type TaskCreateNestedOneWithoutTaskActivitiesInput = {
    create?: XOR<TaskCreateWithoutTaskActivitiesInput, TaskUncheckedCreateWithoutTaskActivitiesInput>
    connectOrCreate?: TaskCreateOrConnectWithoutTaskActivitiesInput
    connect?: TaskWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutTaskActivitiesInput = {
    create?: XOR<UserCreateWithoutTaskActivitiesInput, UserUncheckedCreateWithoutTaskActivitiesInput>
    connectOrCreate?: UserCreateOrConnectWithoutTaskActivitiesInput
    connect?: UserWhereUniqueInput
  }

  export type TaskSubmissionCreateNestedOneWithoutTaskActivitiesInput = {
    create?: XOR<TaskSubmissionCreateWithoutTaskActivitiesInput, TaskSubmissionUncheckedCreateWithoutTaskActivitiesInput>
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutTaskActivitiesInput
    connect?: TaskSubmissionWhereUniqueInput
  }

  export type TaskUpdateOneRequiredWithoutTaskActivitiesNestedInput = {
    create?: XOR<TaskCreateWithoutTaskActivitiesInput, TaskUncheckedCreateWithoutTaskActivitiesInput>
    connectOrCreate?: TaskCreateOrConnectWithoutTaskActivitiesInput
    upsert?: TaskUpsertWithoutTaskActivitiesInput
    connect?: TaskWhereUniqueInput
    update?: XOR<XOR<TaskUpdateToOneWithWhereWithoutTaskActivitiesInput, TaskUpdateWithoutTaskActivitiesInput>, TaskUncheckedUpdateWithoutTaskActivitiesInput>
  }

  export type UserUpdateOneWithoutTaskActivitiesNestedInput = {
    create?: XOR<UserCreateWithoutTaskActivitiesInput, UserUncheckedCreateWithoutTaskActivitiesInput>
    connectOrCreate?: UserCreateOrConnectWithoutTaskActivitiesInput
    upsert?: UserUpsertWithoutTaskActivitiesInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTaskActivitiesInput, UserUpdateWithoutTaskActivitiesInput>, UserUncheckedUpdateWithoutTaskActivitiesInput>
  }

  export type TaskSubmissionUpdateOneWithoutTaskActivitiesNestedInput = {
    create?: XOR<TaskSubmissionCreateWithoutTaskActivitiesInput, TaskSubmissionUncheckedCreateWithoutTaskActivitiesInput>
    connectOrCreate?: TaskSubmissionCreateOrConnectWithoutTaskActivitiesInput
    upsert?: TaskSubmissionUpsertWithoutTaskActivitiesInput
    disconnect?: TaskSubmissionWhereInput | boolean
    delete?: TaskSubmissionWhereInput | boolean
    connect?: TaskSubmissionWhereUniqueInput
    update?: XOR<XOR<TaskSubmissionUpdateToOneWithWhereWithoutTaskActivitiesInput, TaskSubmissionUpdateWithoutTaskActivitiesInput>, TaskSubmissionUncheckedUpdateWithoutTaskActivitiesInput>
  }

  export type UserInstallationPermissionCreateNestedManyWithoutPermissionsInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutPermissionsInput, UserInstallationPermissionUncheckedCreateWithoutPermissionsInput> | UserInstallationPermissionCreateWithoutPermissionsInput[] | UserInstallationPermissionUncheckedCreateWithoutPermissionsInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutPermissionsInput | UserInstallationPermissionCreateOrConnectWithoutPermissionsInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
  }

  export type UserInstallationPermissionUncheckedCreateNestedManyWithoutPermissionsInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutPermissionsInput, UserInstallationPermissionUncheckedCreateWithoutPermissionsInput> | UserInstallationPermissionCreateWithoutPermissionsInput[] | UserInstallationPermissionUncheckedCreateWithoutPermissionsInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutPermissionsInput | UserInstallationPermissionCreateOrConnectWithoutPermissionsInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
  }

  export type UserInstallationPermissionUpdateManyWithoutPermissionsNestedInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutPermissionsInput, UserInstallationPermissionUncheckedCreateWithoutPermissionsInput> | UserInstallationPermissionCreateWithoutPermissionsInput[] | UserInstallationPermissionUncheckedCreateWithoutPermissionsInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutPermissionsInput | UserInstallationPermissionCreateOrConnectWithoutPermissionsInput[]
    upsert?: UserInstallationPermissionUpsertWithWhereUniqueWithoutPermissionsInput | UserInstallationPermissionUpsertWithWhereUniqueWithoutPermissionsInput[]
    set?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    disconnect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    delete?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    update?: UserInstallationPermissionUpdateWithWhereUniqueWithoutPermissionsInput | UserInstallationPermissionUpdateWithWhereUniqueWithoutPermissionsInput[]
    updateMany?: UserInstallationPermissionUpdateManyWithWhereWithoutPermissionsInput | UserInstallationPermissionUpdateManyWithWhereWithoutPermissionsInput[]
    deleteMany?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
  }

  export type UserInstallationPermissionUncheckedUpdateManyWithoutPermissionsNestedInput = {
    create?: XOR<UserInstallationPermissionCreateWithoutPermissionsInput, UserInstallationPermissionUncheckedCreateWithoutPermissionsInput> | UserInstallationPermissionCreateWithoutPermissionsInput[] | UserInstallationPermissionUncheckedCreateWithoutPermissionsInput[]
    connectOrCreate?: UserInstallationPermissionCreateOrConnectWithoutPermissionsInput | UserInstallationPermissionCreateOrConnectWithoutPermissionsInput[]
    upsert?: UserInstallationPermissionUpsertWithWhereUniqueWithoutPermissionsInput | UserInstallationPermissionUpsertWithWhereUniqueWithoutPermissionsInput[]
    set?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    disconnect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    delete?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    connect?: UserInstallationPermissionWhereUniqueInput | UserInstallationPermissionWhereUniqueInput[]
    update?: UserInstallationPermissionUpdateWithWhereUniqueWithoutPermissionsInput | UserInstallationPermissionUpdateWithWhereUniqueWithoutPermissionsInput[]
    updateMany?: UserInstallationPermissionUpdateManyWithWhereWithoutPermissionsInput | UserInstallationPermissionUpdateManyWithWhereWithoutPermissionsInput[]
    deleteMany?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
  }

  export type UserInstallationPermissionCreatepermissionCodesInput = {
    set: string[]
  }

  export type UserCreateNestedOneWithoutUserInstallationPermissionsInput = {
    create?: XOR<UserCreateWithoutUserInstallationPermissionsInput, UserUncheckedCreateWithoutUserInstallationPermissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUserInstallationPermissionsInput
    connect?: UserWhereUniqueInput
  }

  export type InstallationCreateNestedOneWithoutUserInstallationPermissionsInput = {
    create?: XOR<InstallationCreateWithoutUserInstallationPermissionsInput, InstallationUncheckedCreateWithoutUserInstallationPermissionsInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutUserInstallationPermissionsInput
    connect?: InstallationWhereUniqueInput
  }

  export type PermissionCreateNestedManyWithoutUserInstallationPermissionsInput = {
    create?: XOR<PermissionCreateWithoutUserInstallationPermissionsInput, PermissionUncheckedCreateWithoutUserInstallationPermissionsInput> | PermissionCreateWithoutUserInstallationPermissionsInput[] | PermissionUncheckedCreateWithoutUserInstallationPermissionsInput[]
    connectOrCreate?: PermissionCreateOrConnectWithoutUserInstallationPermissionsInput | PermissionCreateOrConnectWithoutUserInstallationPermissionsInput[]
    connect?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
  }

  export type PermissionUncheckedCreateNestedManyWithoutUserInstallationPermissionsInput = {
    create?: XOR<PermissionCreateWithoutUserInstallationPermissionsInput, PermissionUncheckedCreateWithoutUserInstallationPermissionsInput> | PermissionCreateWithoutUserInstallationPermissionsInput[] | PermissionUncheckedCreateWithoutUserInstallationPermissionsInput[]
    connectOrCreate?: PermissionCreateOrConnectWithoutUserInstallationPermissionsInput | PermissionCreateOrConnectWithoutUserInstallationPermissionsInput[]
    connect?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
  }

  export type UserInstallationPermissionUpdatepermissionCodesInput = {
    set?: string[]
    push?: string | string[]
  }

  export type UserUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput = {
    create?: XOR<UserCreateWithoutUserInstallationPermissionsInput, UserUncheckedCreateWithoutUserInstallationPermissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUserInstallationPermissionsInput
    upsert?: UserUpsertWithoutUserInstallationPermissionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUserInstallationPermissionsInput, UserUpdateWithoutUserInstallationPermissionsInput>, UserUncheckedUpdateWithoutUserInstallationPermissionsInput>
  }

  export type InstallationUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput = {
    create?: XOR<InstallationCreateWithoutUserInstallationPermissionsInput, InstallationUncheckedCreateWithoutUserInstallationPermissionsInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutUserInstallationPermissionsInput
    upsert?: InstallationUpsertWithoutUserInstallationPermissionsInput
    connect?: InstallationWhereUniqueInput
    update?: XOR<XOR<InstallationUpdateToOneWithWhereWithoutUserInstallationPermissionsInput, InstallationUpdateWithoutUserInstallationPermissionsInput>, InstallationUncheckedUpdateWithoutUserInstallationPermissionsInput>
  }

  export type PermissionUpdateManyWithoutUserInstallationPermissionsNestedInput = {
    create?: XOR<PermissionCreateWithoutUserInstallationPermissionsInput, PermissionUncheckedCreateWithoutUserInstallationPermissionsInput> | PermissionCreateWithoutUserInstallationPermissionsInput[] | PermissionUncheckedCreateWithoutUserInstallationPermissionsInput[]
    connectOrCreate?: PermissionCreateOrConnectWithoutUserInstallationPermissionsInput | PermissionCreateOrConnectWithoutUserInstallationPermissionsInput[]
    upsert?: PermissionUpsertWithWhereUniqueWithoutUserInstallationPermissionsInput | PermissionUpsertWithWhereUniqueWithoutUserInstallationPermissionsInput[]
    set?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    disconnect?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    delete?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    connect?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    update?: PermissionUpdateWithWhereUniqueWithoutUserInstallationPermissionsInput | PermissionUpdateWithWhereUniqueWithoutUserInstallationPermissionsInput[]
    updateMany?: PermissionUpdateManyWithWhereWithoutUserInstallationPermissionsInput | PermissionUpdateManyWithWhereWithoutUserInstallationPermissionsInput[]
    deleteMany?: PermissionScalarWhereInput | PermissionScalarWhereInput[]
  }

  export type PermissionUncheckedUpdateManyWithoutUserInstallationPermissionsNestedInput = {
    create?: XOR<PermissionCreateWithoutUserInstallationPermissionsInput, PermissionUncheckedCreateWithoutUserInstallationPermissionsInput> | PermissionCreateWithoutUserInstallationPermissionsInput[] | PermissionUncheckedCreateWithoutUserInstallationPermissionsInput[]
    connectOrCreate?: PermissionCreateOrConnectWithoutUserInstallationPermissionsInput | PermissionCreateOrConnectWithoutUserInstallationPermissionsInput[]
    upsert?: PermissionUpsertWithWhereUniqueWithoutUserInstallationPermissionsInput | PermissionUpsertWithWhereUniqueWithoutUserInstallationPermissionsInput[]
    set?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    disconnect?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    delete?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    connect?: PermissionWhereUniqueInput | PermissionWhereUniqueInput[]
    update?: PermissionUpdateWithWhereUniqueWithoutUserInstallationPermissionsInput | PermissionUpdateWithWhereUniqueWithoutUserInstallationPermissionsInput[]
    updateMany?: PermissionUpdateManyWithWhereWithoutUserInstallationPermissionsInput | PermissionUpdateManyWithWhereWithoutUserInstallationPermissionsInput[]
    deleteMany?: PermissionScalarWhereInput | PermissionScalarWhereInput[]
  }

  export type TaskCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<TaskCreateWithoutTransactionsInput, TaskUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: TaskCreateOrConnectWithoutTransactionsInput
    connect?: TaskWhereUniqueInput
  }

  export type InstallationCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<InstallationCreateWithoutTransactionsInput, InstallationUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutTransactionsInput
    connect?: InstallationWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransactionsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumTransactionCategoryFieldUpdateOperationsInput = {
    set?: $Enums.TransactionCategory
  }

  export type TaskUpdateOneWithoutTransactionsNestedInput = {
    create?: XOR<TaskCreateWithoutTransactionsInput, TaskUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: TaskCreateOrConnectWithoutTransactionsInput
    upsert?: TaskUpsertWithoutTransactionsInput
    disconnect?: TaskWhereInput | boolean
    delete?: TaskWhereInput | boolean
    connect?: TaskWhereUniqueInput
    update?: XOR<XOR<TaskUpdateToOneWithWhereWithoutTransactionsInput, TaskUpdateWithoutTransactionsInput>, TaskUncheckedUpdateWithoutTransactionsInput>
  }

  export type InstallationUpdateOneWithoutTransactionsNestedInput = {
    create?: XOR<InstallationCreateWithoutTransactionsInput, InstallationUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: InstallationCreateOrConnectWithoutTransactionsInput
    upsert?: InstallationUpsertWithoutTransactionsInput
    disconnect?: InstallationWhereInput | boolean
    delete?: InstallationWhereInput | boolean
    connect?: InstallationWhereUniqueInput
    update?: XOR<XOR<InstallationUpdateToOneWithWhereWithoutTransactionsInput, InstallationUpdateWithoutTransactionsInput>, InstallationUncheckedUpdateWithoutTransactionsInput>
  }

  export type UserUpdateOneWithoutTransactionsNestedInput = {
    create?: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransactionsInput
    upsert?: UserUpsertWithoutTransactionsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTransactionsInput, UserUpdateWithoutTransactionsInput>, UserUncheckedUpdateWithoutTransactionsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumTimelineTypeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.TimelineType | EnumTimelineTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTimelineTypeNullableFilter<$PrismaModel> | $Enums.TimelineType | null
  }

  export type NestedEnumTaskStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusFilter<$PrismaModel> | $Enums.TaskStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedEnumTimelineTypeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TimelineType | EnumTimelineTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TimelineType[] | ListEnumTimelineTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTimelineTypeNullableWithAggregatesFilter<$PrismaModel> | $Enums.TimelineType | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumTimelineTypeNullableFilter<$PrismaModel>
    _max?: NestedEnumTimelineTypeNullableFilter<$PrismaModel>
  }

  export type NestedEnumTaskStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusWithAggregatesFilter<$PrismaModel> | $Enums.TaskStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTaskStatusFilter<$PrismaModel>
    _max?: NestedEnumTaskStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumTransactionCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionCategory | EnumTransactionCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionCategoryFilter<$PrismaModel> | $Enums.TransactionCategory
  }

  export type NestedEnumTransactionCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionCategory | EnumTransactionCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionCategory[] | ListEnumTransactionCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionCategoryWithAggregatesFilter<$PrismaModel> | $Enums.TransactionCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionCategoryFilter<$PrismaModel>
    _max?: NestedEnumTransactionCategoryFilter<$PrismaModel>
  }

  export type ContributionSummaryCreateWithoutUserInput = {
    id?: string
    tasksCompleted?: number
    activeTasks?: number
    totalEarnings?: number
  }

  export type ContributionSummaryUncheckedCreateWithoutUserInput = {
    id?: string
    tasksCompleted?: number
    activeTasks?: number
    totalEarnings?: number
  }

  export type ContributionSummaryCreateOrConnectWithoutUserInput = {
    where: ContributionSummaryWhereUniqueInput
    create: XOR<ContributionSummaryCreateWithoutUserInput, ContributionSummaryUncheckedCreateWithoutUserInput>
  }

  export type TaskCreateWithoutCreatorInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserCreateNestedManyWithoutTasksAppliedForInput
    contributor?: UserCreateNestedOneWithoutContributedTasksInput
    installation: InstallationCreateNestedOneWithoutTasksInput
    transactions?: TransactionCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutCreatorInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserUncheckedCreateNestedManyWithoutTasksAppliedForInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutCreatorInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput>
  }

  export type TaskCreateManyCreatorInputEnvelope = {
    data: TaskCreateManyCreatorInput | TaskCreateManyCreatorInput[]
    skipDuplicates?: boolean
  }

  export type TaskCreateWithoutContributorInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserCreateNestedManyWithoutTasksAppliedForInput
    creator: UserCreateNestedOneWithoutCreatedTasksInput
    installation: InstallationCreateNestedOneWithoutTasksInput
    transactions?: TransactionCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutContributorInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserUncheckedCreateNestedManyWithoutTasksAppliedForInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutContributorInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutContributorInput, TaskUncheckedCreateWithoutContributorInput>
  }

  export type TaskCreateManyContributorInputEnvelope = {
    data: TaskCreateManyContributorInput | TaskCreateManyContributorInput[]
    skipDuplicates?: boolean
  }

  export type InstallationCreateWithoutUsersInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptionPackage?: SubscriptionPackageCreateNestedOneWithoutInstallationsInput
    tasks?: TaskCreateNestedManyWithoutInstallationInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutInstallationInput
    transactions?: TransactionCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUncheckedCreateWithoutUsersInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskUncheckedCreateNestedManyWithoutInstallationInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutInstallationInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutInstallationInput
  }

  export type InstallationCreateOrConnectWithoutUsersInput = {
    where: InstallationWhereUniqueInput
    create: XOR<InstallationCreateWithoutUsersInput, InstallationUncheckedCreateWithoutUsersInput>
  }

  export type UserInstallationPermissionCreateWithoutUserInput = {
    id?: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
    installation: InstallationCreateNestedOneWithoutUserInstallationPermissionsInput
    permissions?: PermissionCreateNestedManyWithoutUserInstallationPermissionsInput
  }

  export type UserInstallationPermissionUncheckedCreateWithoutUserInput = {
    id?: string
    installationId: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
    permissions?: PermissionUncheckedCreateNestedManyWithoutUserInstallationPermissionsInput
  }

  export type UserInstallationPermissionCreateOrConnectWithoutUserInput = {
    where: UserInstallationPermissionWhereUniqueInput
    create: XOR<UserInstallationPermissionCreateWithoutUserInput, UserInstallationPermissionUncheckedCreateWithoutUserInput>
  }

  export type UserInstallationPermissionCreateManyUserInputEnvelope = {
    data: UserInstallationPermissionCreateManyUserInput | UserInstallationPermissionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TransactionCreateWithoutUserInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    task?: TaskCreateNestedOneWithoutTransactionsInput
    installation?: InstallationCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutUserInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    taskId?: string | null
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    installationId?: string | null
  }

  export type TransactionCreateOrConnectWithoutUserInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput>
  }

  export type TransactionCreateManyUserInputEnvelope = {
    data: TransactionCreateManyUserInput | TransactionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TaskCreateWithoutApplicationsInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    creator: UserCreateNestedOneWithoutCreatedTasksInput
    contributor?: UserCreateNestedOneWithoutContributedTasksInput
    installation: InstallationCreateNestedOneWithoutTasksInput
    transactions?: TransactionCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutApplicationsInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutApplicationsInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutApplicationsInput, TaskUncheckedCreateWithoutApplicationsInput>
  }

  export type TaskSubmissionCreateWithoutUserInput = {
    id?: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    task: TaskCreateNestedOneWithoutTaskSubmissionsInput
    installation: InstallationCreateNestedOneWithoutTaskSubmissionsInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionUncheckedCreateWithoutUserInput = {
    id?: string
    taskId: string
    installationId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionCreateOrConnectWithoutUserInput = {
    where: TaskSubmissionWhereUniqueInput
    create: XOR<TaskSubmissionCreateWithoutUserInput, TaskSubmissionUncheckedCreateWithoutUserInput>
  }

  export type TaskSubmissionCreateManyUserInputEnvelope = {
    data: TaskSubmissionCreateManyUserInput | TaskSubmissionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TaskActivityCreateWithoutUserInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    task: TaskCreateNestedOneWithoutTaskActivitiesInput
    taskSubmission?: TaskSubmissionCreateNestedOneWithoutTaskActivitiesInput
  }

  export type TaskActivityUncheckedCreateWithoutUserInput = {
    id?: string
    taskId: string
    taskSubmissionId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityCreateOrConnectWithoutUserInput = {
    where: TaskActivityWhereUniqueInput
    create: XOR<TaskActivityCreateWithoutUserInput, TaskActivityUncheckedCreateWithoutUserInput>
  }

  export type TaskActivityCreateManyUserInputEnvelope = {
    data: TaskActivityCreateManyUserInput | TaskActivityCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type ContributionSummaryUpsertWithoutUserInput = {
    update: XOR<ContributionSummaryUpdateWithoutUserInput, ContributionSummaryUncheckedUpdateWithoutUserInput>
    create: XOR<ContributionSummaryCreateWithoutUserInput, ContributionSummaryUncheckedCreateWithoutUserInput>
    where?: ContributionSummaryWhereInput
  }

  export type ContributionSummaryUpdateToOneWithWhereWithoutUserInput = {
    where?: ContributionSummaryWhereInput
    data: XOR<ContributionSummaryUpdateWithoutUserInput, ContributionSummaryUncheckedUpdateWithoutUserInput>
  }

  export type ContributionSummaryUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tasksCompleted?: IntFieldUpdateOperationsInput | number
    activeTasks?: IntFieldUpdateOperationsInput | number
    totalEarnings?: FloatFieldUpdateOperationsInput | number
  }

  export type ContributionSummaryUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tasksCompleted?: IntFieldUpdateOperationsInput | number
    activeTasks?: IntFieldUpdateOperationsInput | number
    totalEarnings?: FloatFieldUpdateOperationsInput | number
  }

  export type TaskUpsertWithWhereUniqueWithoutCreatorInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutCreatorInput, TaskUncheckedUpdateWithoutCreatorInput>
    create: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutCreatorInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutCreatorInput, TaskUncheckedUpdateWithoutCreatorInput>
  }

  export type TaskUpdateManyWithWhereWithoutCreatorInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutCreatorInput>
  }

  export type TaskScalarWhereInput = {
    AND?: TaskScalarWhereInput | TaskScalarWhereInput[]
    OR?: TaskScalarWhereInput[]
    NOT?: TaskScalarWhereInput | TaskScalarWhereInput[]
    id?: StringFilter<"Task"> | string
    issue?: JsonFilter<"Task">
    timeline?: FloatNullableFilter<"Task"> | number | null
    timelineType?: EnumTimelineTypeNullableFilter<"Task"> | $Enums.TimelineType | null
    bounty?: FloatFilter<"Task"> | number
    status?: EnumTaskStatusFilter<"Task"> | $Enums.TaskStatus
    settled?: BoolFilter<"Task"> | boolean
    acceptedAt?: DateTimeNullableFilter<"Task"> | Date | string | null
    completedAt?: DateTimeNullableFilter<"Task"> | Date | string | null
    creatorId?: StringFilter<"Task"> | string
    contributorId?: StringNullableFilter<"Task"> | string | null
    installationId?: StringFilter<"Task"> | string
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
  }

  export type TaskUpsertWithWhereUniqueWithoutContributorInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutContributorInput, TaskUncheckedUpdateWithoutContributorInput>
    create: XOR<TaskCreateWithoutContributorInput, TaskUncheckedCreateWithoutContributorInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutContributorInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutContributorInput, TaskUncheckedUpdateWithoutContributorInput>
  }

  export type TaskUpdateManyWithWhereWithoutContributorInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutContributorInput>
  }

  export type InstallationUpsertWithWhereUniqueWithoutUsersInput = {
    where: InstallationWhereUniqueInput
    update: XOR<InstallationUpdateWithoutUsersInput, InstallationUncheckedUpdateWithoutUsersInput>
    create: XOR<InstallationCreateWithoutUsersInput, InstallationUncheckedCreateWithoutUsersInput>
  }

  export type InstallationUpdateWithWhereUniqueWithoutUsersInput = {
    where: InstallationWhereUniqueInput
    data: XOR<InstallationUpdateWithoutUsersInput, InstallationUncheckedUpdateWithoutUsersInput>
  }

  export type InstallationUpdateManyWithWhereWithoutUsersInput = {
    where: InstallationScalarWhereInput
    data: XOR<InstallationUpdateManyMutationInput, InstallationUncheckedUpdateManyWithoutUsersInput>
  }

  export type InstallationScalarWhereInput = {
    AND?: InstallationScalarWhereInput | InstallationScalarWhereInput[]
    OR?: InstallationScalarWhereInput[]
    NOT?: InstallationScalarWhereInput | InstallationScalarWhereInput[]
    id?: StringFilter<"Installation"> | string
    htmlUrl?: StringFilter<"Installation"> | string
    targetId?: IntFilter<"Installation"> | number
    targetType?: StringFilter<"Installation"> | string
    account?: JsonFilter<"Installation">
    walletAddress?: StringFilter<"Installation"> | string
    walletSecret?: StringFilter<"Installation"> | string
    escrowAddress?: StringFilter<"Installation"> | string
    escrowSecret?: StringFilter<"Installation"> | string
    subscriptionPackageId?: StringNullableFilter<"Installation"> | string | null
    createdAt?: DateTimeFilter<"Installation"> | Date | string
    updatedAt?: DateTimeFilter<"Installation"> | Date | string
  }

  export type UserInstallationPermissionUpsertWithWhereUniqueWithoutUserInput = {
    where: UserInstallationPermissionWhereUniqueInput
    update: XOR<UserInstallationPermissionUpdateWithoutUserInput, UserInstallationPermissionUncheckedUpdateWithoutUserInput>
    create: XOR<UserInstallationPermissionCreateWithoutUserInput, UserInstallationPermissionUncheckedCreateWithoutUserInput>
  }

  export type UserInstallationPermissionUpdateWithWhereUniqueWithoutUserInput = {
    where: UserInstallationPermissionWhereUniqueInput
    data: XOR<UserInstallationPermissionUpdateWithoutUserInput, UserInstallationPermissionUncheckedUpdateWithoutUserInput>
  }

  export type UserInstallationPermissionUpdateManyWithWhereWithoutUserInput = {
    where: UserInstallationPermissionScalarWhereInput
    data: XOR<UserInstallationPermissionUpdateManyMutationInput, UserInstallationPermissionUncheckedUpdateManyWithoutUserInput>
  }

  export type UserInstallationPermissionScalarWhereInput = {
    AND?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
    OR?: UserInstallationPermissionScalarWhereInput[]
    NOT?: UserInstallationPermissionScalarWhereInput | UserInstallationPermissionScalarWhereInput[]
    id?: StringFilter<"UserInstallationPermission"> | string
    userId?: StringFilter<"UserInstallationPermission"> | string
    installationId?: StringFilter<"UserInstallationPermission"> | string
    permissionCodes?: StringNullableListFilter<"UserInstallationPermission">
    assignedBy?: StringNullableFilter<"UserInstallationPermission"> | string | null
    assignedAt?: DateTimeFilter<"UserInstallationPermission"> | Date | string
  }

  export type TransactionUpsertWithWhereUniqueWithoutUserInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutUserInput, TransactionUncheckedUpdateWithoutUserInput>
    create: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutUserInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutUserInput, TransactionUncheckedUpdateWithoutUserInput>
  }

  export type TransactionUpdateManyWithWhereWithoutUserInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutUserInput>
  }

  export type TransactionScalarWhereInput = {
    AND?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    OR?: TransactionScalarWhereInput[]
    NOT?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    id?: StringFilter<"Transaction"> | string
    txHash?: StringFilter<"Transaction"> | string
    category?: EnumTransactionCategoryFilter<"Transaction"> | $Enums.TransactionCategory
    amount?: FloatFilter<"Transaction"> | number
    doneAt?: DateTimeFilter<"Transaction"> | Date | string
    taskId?: StringNullableFilter<"Transaction"> | string | null
    sourceAddress?: StringNullableFilter<"Transaction"> | string | null
    destinationAddress?: StringNullableFilter<"Transaction"> | string | null
    asset?: StringNullableFilter<"Transaction"> | string | null
    assetFrom?: StringNullableFilter<"Transaction"> | string | null
    assetTo?: StringNullableFilter<"Transaction"> | string | null
    fromAmount?: FloatNullableFilter<"Transaction"> | number | null
    toAmount?: FloatNullableFilter<"Transaction"> | number | null
    installationId?: StringNullableFilter<"Transaction"> | string | null
    userId?: StringNullableFilter<"Transaction"> | string | null
  }

  export type TaskUpsertWithWhereUniqueWithoutApplicationsInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutApplicationsInput, TaskUncheckedUpdateWithoutApplicationsInput>
    create: XOR<TaskCreateWithoutApplicationsInput, TaskUncheckedCreateWithoutApplicationsInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutApplicationsInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutApplicationsInput, TaskUncheckedUpdateWithoutApplicationsInput>
  }

  export type TaskUpdateManyWithWhereWithoutApplicationsInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutApplicationsInput>
  }

  export type TaskSubmissionUpsertWithWhereUniqueWithoutUserInput = {
    where: TaskSubmissionWhereUniqueInput
    update: XOR<TaskSubmissionUpdateWithoutUserInput, TaskSubmissionUncheckedUpdateWithoutUserInput>
    create: XOR<TaskSubmissionCreateWithoutUserInput, TaskSubmissionUncheckedCreateWithoutUserInput>
  }

  export type TaskSubmissionUpdateWithWhereUniqueWithoutUserInput = {
    where: TaskSubmissionWhereUniqueInput
    data: XOR<TaskSubmissionUpdateWithoutUserInput, TaskSubmissionUncheckedUpdateWithoutUserInput>
  }

  export type TaskSubmissionUpdateManyWithWhereWithoutUserInput = {
    where: TaskSubmissionScalarWhereInput
    data: XOR<TaskSubmissionUpdateManyMutationInput, TaskSubmissionUncheckedUpdateManyWithoutUserInput>
  }

  export type TaskSubmissionScalarWhereInput = {
    AND?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
    OR?: TaskSubmissionScalarWhereInput[]
    NOT?: TaskSubmissionScalarWhereInput | TaskSubmissionScalarWhereInput[]
    id?: StringFilter<"TaskSubmission"> | string
    userId?: StringFilter<"TaskSubmission"> | string
    taskId?: StringFilter<"TaskSubmission"> | string
    installationId?: StringFilter<"TaskSubmission"> | string
    pullRequest?: StringFilter<"TaskSubmission"> | string
    attachmentUrl?: StringNullableFilter<"TaskSubmission"> | string | null
    createdAt?: DateTimeFilter<"TaskSubmission"> | Date | string
    updatedAt?: DateTimeFilter<"TaskSubmission"> | Date | string
  }

  export type TaskActivityUpsertWithWhereUniqueWithoutUserInput = {
    where: TaskActivityWhereUniqueInput
    update: XOR<TaskActivityUpdateWithoutUserInput, TaskActivityUncheckedUpdateWithoutUserInput>
    create: XOR<TaskActivityCreateWithoutUserInput, TaskActivityUncheckedCreateWithoutUserInput>
  }

  export type TaskActivityUpdateWithWhereUniqueWithoutUserInput = {
    where: TaskActivityWhereUniqueInput
    data: XOR<TaskActivityUpdateWithoutUserInput, TaskActivityUncheckedUpdateWithoutUserInput>
  }

  export type TaskActivityUpdateManyWithWhereWithoutUserInput = {
    where: TaskActivityScalarWhereInput
    data: XOR<TaskActivityUpdateManyMutationInput, TaskActivityUncheckedUpdateManyWithoutUserInput>
  }

  export type TaskActivityScalarWhereInput = {
    AND?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
    OR?: TaskActivityScalarWhereInput[]
    NOT?: TaskActivityScalarWhereInput | TaskActivityScalarWhereInput[]
    id?: StringFilter<"TaskActivity"> | string
    taskId?: StringFilter<"TaskActivity"> | string
    userId?: StringNullableFilter<"TaskActivity"> | string | null
    taskSubmissionId?: StringNullableFilter<"TaskActivity"> | string | null
    createdAt?: DateTimeFilter<"TaskActivity"> | Date | string
    updatedAt?: DateTimeFilter<"TaskActivity"> | Date | string
  }

  export type UserCreateWithoutContributionSummaryInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutContributionSummaryInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutContributionSummaryInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutContributionSummaryInput, UserUncheckedCreateWithoutContributionSummaryInput>
  }

  export type UserUpsertWithoutContributionSummaryInput = {
    update: XOR<UserUpdateWithoutContributionSummaryInput, UserUncheckedUpdateWithoutContributionSummaryInput>
    create: XOR<UserCreateWithoutContributionSummaryInput, UserUncheckedCreateWithoutContributionSummaryInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutContributionSummaryInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutContributionSummaryInput, UserUncheckedUpdateWithoutContributionSummaryInput>
  }

  export type UserUpdateWithoutContributionSummaryInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutContributionSummaryInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type InstallationCreateWithoutSubscriptionPackageInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskCreateNestedManyWithoutInstallationInput
    users?: UserCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutInstallationInput
    transactions?: TransactionCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUncheckedCreateWithoutSubscriptionPackageInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskUncheckedCreateNestedManyWithoutInstallationInput
    users?: UserUncheckedCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutInstallationInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutInstallationInput
  }

  export type InstallationCreateOrConnectWithoutSubscriptionPackageInput = {
    where: InstallationWhereUniqueInput
    create: XOR<InstallationCreateWithoutSubscriptionPackageInput, InstallationUncheckedCreateWithoutSubscriptionPackageInput>
  }

  export type InstallationCreateManySubscriptionPackageInputEnvelope = {
    data: InstallationCreateManySubscriptionPackageInput | InstallationCreateManySubscriptionPackageInput[]
    skipDuplicates?: boolean
  }

  export type InstallationUpsertWithWhereUniqueWithoutSubscriptionPackageInput = {
    where: InstallationWhereUniqueInput
    update: XOR<InstallationUpdateWithoutSubscriptionPackageInput, InstallationUncheckedUpdateWithoutSubscriptionPackageInput>
    create: XOR<InstallationCreateWithoutSubscriptionPackageInput, InstallationUncheckedCreateWithoutSubscriptionPackageInput>
  }

  export type InstallationUpdateWithWhereUniqueWithoutSubscriptionPackageInput = {
    where: InstallationWhereUniqueInput
    data: XOR<InstallationUpdateWithoutSubscriptionPackageInput, InstallationUncheckedUpdateWithoutSubscriptionPackageInput>
  }

  export type InstallationUpdateManyWithWhereWithoutSubscriptionPackageInput = {
    where: InstallationScalarWhereInput
    data: XOR<InstallationUpdateManyMutationInput, InstallationUncheckedUpdateManyWithoutSubscriptionPackageInput>
  }

  export type SubscriptionPackageCreateWithoutInstallationsInput = {
    id?: string
    name: string
    description: string
    maxTasks: number
    maxUsers: number
    paid?: boolean
    price: number
    active?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionPackageUncheckedCreateWithoutInstallationsInput = {
    id?: string
    name: string
    description: string
    maxTasks: number
    maxUsers: number
    paid?: boolean
    price: number
    active?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionPackageCreateOrConnectWithoutInstallationsInput = {
    where: SubscriptionPackageWhereUniqueInput
    create: XOR<SubscriptionPackageCreateWithoutInstallationsInput, SubscriptionPackageUncheckedCreateWithoutInstallationsInput>
  }

  export type TaskCreateWithoutInstallationInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserCreateNestedManyWithoutTasksAppliedForInput
    creator: UserCreateNestedOneWithoutCreatedTasksInput
    contributor?: UserCreateNestedOneWithoutContributedTasksInput
    transactions?: TransactionCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutInstallationInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserUncheckedCreateNestedManyWithoutTasksAppliedForInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutInstallationInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutInstallationInput, TaskUncheckedCreateWithoutInstallationInput>
  }

  export type TaskCreateManyInstallationInputEnvelope = {
    data: TaskCreateManyInstallationInput | TaskCreateManyInstallationInput[]
    skipDuplicates?: boolean
  }

  export type UserCreateWithoutInstallationsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutInstallationsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutInstallationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutInstallationsInput, UserUncheckedCreateWithoutInstallationsInput>
  }

  export type UserInstallationPermissionCreateWithoutInstallationInput = {
    id?: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
    user: UserCreateNestedOneWithoutUserInstallationPermissionsInput
    permissions?: PermissionCreateNestedManyWithoutUserInstallationPermissionsInput
  }

  export type UserInstallationPermissionUncheckedCreateWithoutInstallationInput = {
    id?: string
    userId: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
    permissions?: PermissionUncheckedCreateNestedManyWithoutUserInstallationPermissionsInput
  }

  export type UserInstallationPermissionCreateOrConnectWithoutInstallationInput = {
    where: UserInstallationPermissionWhereUniqueInput
    create: XOR<UserInstallationPermissionCreateWithoutInstallationInput, UserInstallationPermissionUncheckedCreateWithoutInstallationInput>
  }

  export type UserInstallationPermissionCreateManyInstallationInputEnvelope = {
    data: UserInstallationPermissionCreateManyInstallationInput | UserInstallationPermissionCreateManyInstallationInput[]
    skipDuplicates?: boolean
  }

  export type TransactionCreateWithoutInstallationInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    task?: TaskCreateNestedOneWithoutTransactionsInput
    user?: UserCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutInstallationInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    taskId?: string | null
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    userId?: string | null
  }

  export type TransactionCreateOrConnectWithoutInstallationInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutInstallationInput, TransactionUncheckedCreateWithoutInstallationInput>
  }

  export type TransactionCreateManyInstallationInputEnvelope = {
    data: TransactionCreateManyInstallationInput | TransactionCreateManyInstallationInput[]
    skipDuplicates?: boolean
  }

  export type TaskSubmissionCreateWithoutInstallationInput = {
    id?: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTaskSubmissionsInput
    task: TaskCreateNestedOneWithoutTaskSubmissionsInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionUncheckedCreateWithoutInstallationInput = {
    id?: string
    userId: string
    taskId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionCreateOrConnectWithoutInstallationInput = {
    where: TaskSubmissionWhereUniqueInput
    create: XOR<TaskSubmissionCreateWithoutInstallationInput, TaskSubmissionUncheckedCreateWithoutInstallationInput>
  }

  export type TaskSubmissionCreateManyInstallationInputEnvelope = {
    data: TaskSubmissionCreateManyInstallationInput | TaskSubmissionCreateManyInstallationInput[]
    skipDuplicates?: boolean
  }

  export type SubscriptionPackageUpsertWithoutInstallationsInput = {
    update: XOR<SubscriptionPackageUpdateWithoutInstallationsInput, SubscriptionPackageUncheckedUpdateWithoutInstallationsInput>
    create: XOR<SubscriptionPackageCreateWithoutInstallationsInput, SubscriptionPackageUncheckedCreateWithoutInstallationsInput>
    where?: SubscriptionPackageWhereInput
  }

  export type SubscriptionPackageUpdateToOneWithWhereWithoutInstallationsInput = {
    where?: SubscriptionPackageWhereInput
    data: XOR<SubscriptionPackageUpdateWithoutInstallationsInput, SubscriptionPackageUncheckedUpdateWithoutInstallationsInput>
  }

  export type SubscriptionPackageUpdateWithoutInstallationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    maxTasks?: IntFieldUpdateOperationsInput | number
    maxUsers?: IntFieldUpdateOperationsInput | number
    paid?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionPackageUncheckedUpdateWithoutInstallationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    maxTasks?: IntFieldUpdateOperationsInput | number
    maxUsers?: IntFieldUpdateOperationsInput | number
    paid?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUpsertWithWhereUniqueWithoutInstallationInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutInstallationInput, TaskUncheckedUpdateWithoutInstallationInput>
    create: XOR<TaskCreateWithoutInstallationInput, TaskUncheckedCreateWithoutInstallationInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutInstallationInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutInstallationInput, TaskUncheckedUpdateWithoutInstallationInput>
  }

  export type TaskUpdateManyWithWhereWithoutInstallationInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutInstallationInput>
  }

  export type UserUpsertWithWhereUniqueWithoutInstallationsInput = {
    where: UserWhereUniqueInput
    update: XOR<UserUpdateWithoutInstallationsInput, UserUncheckedUpdateWithoutInstallationsInput>
    create: XOR<UserCreateWithoutInstallationsInput, UserUncheckedCreateWithoutInstallationsInput>
  }

  export type UserUpdateWithWhereUniqueWithoutInstallationsInput = {
    where: UserWhereUniqueInput
    data: XOR<UserUpdateWithoutInstallationsInput, UserUncheckedUpdateWithoutInstallationsInput>
  }

  export type UserUpdateManyWithWhereWithoutInstallationsInput = {
    where: UserScalarWhereInput
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyWithoutInstallationsInput>
  }

  export type UserScalarWhereInput = {
    AND?: UserScalarWhereInput | UserScalarWhereInput[]
    OR?: UserScalarWhereInput[]
    NOT?: UserScalarWhereInput | UserScalarWhereInput[]
    userId?: StringFilter<"User"> | string
    username?: StringFilter<"User"> | string
    walletAddress?: StringFilter<"User"> | string
    walletSecret?: StringFilter<"User"> | string
    addressBook?: JsonNullableListFilter<"User">
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }

  export type UserInstallationPermissionUpsertWithWhereUniqueWithoutInstallationInput = {
    where: UserInstallationPermissionWhereUniqueInput
    update: XOR<UserInstallationPermissionUpdateWithoutInstallationInput, UserInstallationPermissionUncheckedUpdateWithoutInstallationInput>
    create: XOR<UserInstallationPermissionCreateWithoutInstallationInput, UserInstallationPermissionUncheckedCreateWithoutInstallationInput>
  }

  export type UserInstallationPermissionUpdateWithWhereUniqueWithoutInstallationInput = {
    where: UserInstallationPermissionWhereUniqueInput
    data: XOR<UserInstallationPermissionUpdateWithoutInstallationInput, UserInstallationPermissionUncheckedUpdateWithoutInstallationInput>
  }

  export type UserInstallationPermissionUpdateManyWithWhereWithoutInstallationInput = {
    where: UserInstallationPermissionScalarWhereInput
    data: XOR<UserInstallationPermissionUpdateManyMutationInput, UserInstallationPermissionUncheckedUpdateManyWithoutInstallationInput>
  }

  export type TransactionUpsertWithWhereUniqueWithoutInstallationInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutInstallationInput, TransactionUncheckedUpdateWithoutInstallationInput>
    create: XOR<TransactionCreateWithoutInstallationInput, TransactionUncheckedCreateWithoutInstallationInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutInstallationInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutInstallationInput, TransactionUncheckedUpdateWithoutInstallationInput>
  }

  export type TransactionUpdateManyWithWhereWithoutInstallationInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutInstallationInput>
  }

  export type TaskSubmissionUpsertWithWhereUniqueWithoutInstallationInput = {
    where: TaskSubmissionWhereUniqueInput
    update: XOR<TaskSubmissionUpdateWithoutInstallationInput, TaskSubmissionUncheckedUpdateWithoutInstallationInput>
    create: XOR<TaskSubmissionCreateWithoutInstallationInput, TaskSubmissionUncheckedCreateWithoutInstallationInput>
  }

  export type TaskSubmissionUpdateWithWhereUniqueWithoutInstallationInput = {
    where: TaskSubmissionWhereUniqueInput
    data: XOR<TaskSubmissionUpdateWithoutInstallationInput, TaskSubmissionUncheckedUpdateWithoutInstallationInput>
  }

  export type TaskSubmissionUpdateManyWithWhereWithoutInstallationInput = {
    where: TaskSubmissionScalarWhereInput
    data: XOR<TaskSubmissionUpdateManyMutationInput, TaskSubmissionUncheckedUpdateManyWithoutInstallationInput>
  }

  export type UserCreateWithoutTasksAppliedForInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTasksAppliedForInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTasksAppliedForInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTasksAppliedForInput, UserUncheckedCreateWithoutTasksAppliedForInput>
  }

  export type UserCreateWithoutCreatedTasksInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutCreatedTasksInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutCreatedTasksInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
  }

  export type UserCreateWithoutContributedTasksInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutContributedTasksInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutContributedTasksInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutContributedTasksInput, UserUncheckedCreateWithoutContributedTasksInput>
  }

  export type InstallationCreateWithoutTasksInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptionPackage?: SubscriptionPackageCreateNestedOneWithoutInstallationsInput
    users?: UserCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutInstallationInput
    transactions?: TransactionCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUncheckedCreateWithoutTasksInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutInstallationInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutInstallationInput
  }

  export type InstallationCreateOrConnectWithoutTasksInput = {
    where: InstallationWhereUniqueInput
    create: XOR<InstallationCreateWithoutTasksInput, InstallationUncheckedCreateWithoutTasksInput>
  }

  export type TransactionCreateWithoutTaskInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    installation?: InstallationCreateNestedOneWithoutTransactionsInput
    user?: UserCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutTaskInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    installationId?: string | null
    userId?: string | null
  }

  export type TransactionCreateOrConnectWithoutTaskInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutTaskInput, TransactionUncheckedCreateWithoutTaskInput>
  }

  export type TransactionCreateManyTaskInputEnvelope = {
    data: TransactionCreateManyTaskInput | TransactionCreateManyTaskInput[]
    skipDuplicates?: boolean
  }

  export type TaskSubmissionCreateWithoutTaskInput = {
    id?: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTaskSubmissionsInput
    installation: InstallationCreateNestedOneWithoutTaskSubmissionsInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionUncheckedCreateWithoutTaskInput = {
    id?: string
    userId: string
    installationId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskSubmissionInput
  }

  export type TaskSubmissionCreateOrConnectWithoutTaskInput = {
    where: TaskSubmissionWhereUniqueInput
    create: XOR<TaskSubmissionCreateWithoutTaskInput, TaskSubmissionUncheckedCreateWithoutTaskInput>
  }

  export type TaskSubmissionCreateManyTaskInputEnvelope = {
    data: TaskSubmissionCreateManyTaskInput | TaskSubmissionCreateManyTaskInput[]
    skipDuplicates?: boolean
  }

  export type TaskActivityCreateWithoutTaskInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    user?: UserCreateNestedOneWithoutTaskActivitiesInput
    taskSubmission?: TaskSubmissionCreateNestedOneWithoutTaskActivitiesInput
  }

  export type TaskActivityUncheckedCreateWithoutTaskInput = {
    id?: string
    userId?: string | null
    taskSubmissionId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityCreateOrConnectWithoutTaskInput = {
    where: TaskActivityWhereUniqueInput
    create: XOR<TaskActivityCreateWithoutTaskInput, TaskActivityUncheckedCreateWithoutTaskInput>
  }

  export type TaskActivityCreateManyTaskInputEnvelope = {
    data: TaskActivityCreateManyTaskInput | TaskActivityCreateManyTaskInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithWhereUniqueWithoutTasksAppliedForInput = {
    where: UserWhereUniqueInput
    update: XOR<UserUpdateWithoutTasksAppliedForInput, UserUncheckedUpdateWithoutTasksAppliedForInput>
    create: XOR<UserCreateWithoutTasksAppliedForInput, UserUncheckedCreateWithoutTasksAppliedForInput>
  }

  export type UserUpdateWithWhereUniqueWithoutTasksAppliedForInput = {
    where: UserWhereUniqueInput
    data: XOR<UserUpdateWithoutTasksAppliedForInput, UserUncheckedUpdateWithoutTasksAppliedForInput>
  }

  export type UserUpdateManyWithWhereWithoutTasksAppliedForInput = {
    where: UserScalarWhereInput
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyWithoutTasksAppliedForInput>
  }

  export type UserUpsertWithoutCreatedTasksInput = {
    update: XOR<UserUpdateWithoutCreatedTasksInput, UserUncheckedUpdateWithoutCreatedTasksInput>
    create: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCreatedTasksInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCreatedTasksInput, UserUncheckedUpdateWithoutCreatedTasksInput>
  }

  export type UserUpdateWithoutCreatedTasksInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutCreatedTasksInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserUpsertWithoutContributedTasksInput = {
    update: XOR<UserUpdateWithoutContributedTasksInput, UserUncheckedUpdateWithoutContributedTasksInput>
    create: XOR<UserCreateWithoutContributedTasksInput, UserUncheckedCreateWithoutContributedTasksInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutContributedTasksInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutContributedTasksInput, UserUncheckedUpdateWithoutContributedTasksInput>
  }

  export type UserUpdateWithoutContributedTasksInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutContributedTasksInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type InstallationUpsertWithoutTasksInput = {
    update: XOR<InstallationUpdateWithoutTasksInput, InstallationUncheckedUpdateWithoutTasksInput>
    create: XOR<InstallationCreateWithoutTasksInput, InstallationUncheckedCreateWithoutTasksInput>
    where?: InstallationWhereInput
  }

  export type InstallationUpdateToOneWithWhereWithoutTasksInput = {
    where?: InstallationWhereInput
    data: XOR<InstallationUpdateWithoutTasksInput, InstallationUncheckedUpdateWithoutTasksInput>
  }

  export type InstallationUpdateWithoutTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptionPackage?: SubscriptionPackageUpdateOneWithoutInstallationsNestedInput
    users?: UserUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateWithoutTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutInstallationNestedInput
  }

  export type TransactionUpsertWithWhereUniqueWithoutTaskInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutTaskInput, TransactionUncheckedUpdateWithoutTaskInput>
    create: XOR<TransactionCreateWithoutTaskInput, TransactionUncheckedCreateWithoutTaskInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutTaskInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutTaskInput, TransactionUncheckedUpdateWithoutTaskInput>
  }

  export type TransactionUpdateManyWithWhereWithoutTaskInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutTaskInput>
  }

  export type TaskSubmissionUpsertWithWhereUniqueWithoutTaskInput = {
    where: TaskSubmissionWhereUniqueInput
    update: XOR<TaskSubmissionUpdateWithoutTaskInput, TaskSubmissionUncheckedUpdateWithoutTaskInput>
    create: XOR<TaskSubmissionCreateWithoutTaskInput, TaskSubmissionUncheckedCreateWithoutTaskInput>
  }

  export type TaskSubmissionUpdateWithWhereUniqueWithoutTaskInput = {
    where: TaskSubmissionWhereUniqueInput
    data: XOR<TaskSubmissionUpdateWithoutTaskInput, TaskSubmissionUncheckedUpdateWithoutTaskInput>
  }

  export type TaskSubmissionUpdateManyWithWhereWithoutTaskInput = {
    where: TaskSubmissionScalarWhereInput
    data: XOR<TaskSubmissionUpdateManyMutationInput, TaskSubmissionUncheckedUpdateManyWithoutTaskInput>
  }

  export type TaskActivityUpsertWithWhereUniqueWithoutTaskInput = {
    where: TaskActivityWhereUniqueInput
    update: XOR<TaskActivityUpdateWithoutTaskInput, TaskActivityUncheckedUpdateWithoutTaskInput>
    create: XOR<TaskActivityCreateWithoutTaskInput, TaskActivityUncheckedCreateWithoutTaskInput>
  }

  export type TaskActivityUpdateWithWhereUniqueWithoutTaskInput = {
    where: TaskActivityWhereUniqueInput
    data: XOR<TaskActivityUpdateWithoutTaskInput, TaskActivityUncheckedUpdateWithoutTaskInput>
  }

  export type TaskActivityUpdateManyWithWhereWithoutTaskInput = {
    where: TaskActivityScalarWhereInput
    data: XOR<TaskActivityUpdateManyMutationInput, TaskActivityUncheckedUpdateManyWithoutTaskInput>
  }

  export type UserCreateWithoutTaskSubmissionsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTaskSubmissionsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTaskSubmissionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTaskSubmissionsInput, UserUncheckedCreateWithoutTaskSubmissionsInput>
  }

  export type TaskCreateWithoutTaskSubmissionsInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserCreateNestedManyWithoutTasksAppliedForInput
    creator: UserCreateNestedOneWithoutCreatedTasksInput
    contributor?: UserCreateNestedOneWithoutContributedTasksInput
    installation: InstallationCreateNestedOneWithoutTasksInput
    transactions?: TransactionCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutTaskSubmissionsInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserUncheckedCreateNestedManyWithoutTasksAppliedForInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutTaskSubmissionsInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutTaskSubmissionsInput, TaskUncheckedCreateWithoutTaskSubmissionsInput>
  }

  export type InstallationCreateWithoutTaskSubmissionsInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptionPackage?: SubscriptionPackageCreateNestedOneWithoutInstallationsInput
    tasks?: TaskCreateNestedManyWithoutInstallationInput
    users?: UserCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutInstallationInput
    transactions?: TransactionCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUncheckedCreateWithoutTaskSubmissionsInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskUncheckedCreateNestedManyWithoutInstallationInput
    users?: UserUncheckedCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutInstallationInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallationInput
  }

  export type InstallationCreateOrConnectWithoutTaskSubmissionsInput = {
    where: InstallationWhereUniqueInput
    create: XOR<InstallationCreateWithoutTaskSubmissionsInput, InstallationUncheckedCreateWithoutTaskSubmissionsInput>
  }

  export type TaskActivityCreateWithoutTaskSubmissionInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    task: TaskCreateNestedOneWithoutTaskActivitiesInput
    user?: UserCreateNestedOneWithoutTaskActivitiesInput
  }

  export type TaskActivityUncheckedCreateWithoutTaskSubmissionInput = {
    id?: string
    taskId: string
    userId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityCreateOrConnectWithoutTaskSubmissionInput = {
    where: TaskActivityWhereUniqueInput
    create: XOR<TaskActivityCreateWithoutTaskSubmissionInput, TaskActivityUncheckedCreateWithoutTaskSubmissionInput>
  }

  export type TaskActivityCreateManyTaskSubmissionInputEnvelope = {
    data: TaskActivityCreateManyTaskSubmissionInput | TaskActivityCreateManyTaskSubmissionInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutTaskSubmissionsInput = {
    update: XOR<UserUpdateWithoutTaskSubmissionsInput, UserUncheckedUpdateWithoutTaskSubmissionsInput>
    create: XOR<UserCreateWithoutTaskSubmissionsInput, UserUncheckedCreateWithoutTaskSubmissionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTaskSubmissionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTaskSubmissionsInput, UserUncheckedUpdateWithoutTaskSubmissionsInput>
  }

  export type UserUpdateWithoutTaskSubmissionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTaskSubmissionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TaskUpsertWithoutTaskSubmissionsInput = {
    update: XOR<TaskUpdateWithoutTaskSubmissionsInput, TaskUncheckedUpdateWithoutTaskSubmissionsInput>
    create: XOR<TaskCreateWithoutTaskSubmissionsInput, TaskUncheckedCreateWithoutTaskSubmissionsInput>
    where?: TaskWhereInput
  }

  export type TaskUpdateToOneWithWhereWithoutTaskSubmissionsInput = {
    where?: TaskWhereInput
    data: XOR<TaskUpdateWithoutTaskSubmissionsInput, TaskUncheckedUpdateWithoutTaskSubmissionsInput>
  }

  export type TaskUpdateWithoutTaskSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUpdateManyWithoutTasksAppliedForNestedInput
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    contributor?: UserUpdateOneWithoutContributedTasksNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTasksNestedInput
    transactions?: TransactionUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutTaskSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type InstallationUpsertWithoutTaskSubmissionsInput = {
    update: XOR<InstallationUpdateWithoutTaskSubmissionsInput, InstallationUncheckedUpdateWithoutTaskSubmissionsInput>
    create: XOR<InstallationCreateWithoutTaskSubmissionsInput, InstallationUncheckedCreateWithoutTaskSubmissionsInput>
    where?: InstallationWhereInput
  }

  export type InstallationUpdateToOneWithWhereWithoutTaskSubmissionsInput = {
    where?: InstallationWhereInput
    data: XOR<InstallationUpdateWithoutTaskSubmissionsInput, InstallationUncheckedUpdateWithoutTaskSubmissionsInput>
  }

  export type InstallationUpdateWithoutTaskSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptionPackage?: SubscriptionPackageUpdateOneWithoutInstallationsNestedInput
    tasks?: TaskUpdateManyWithoutInstallationNestedInput
    users?: UserUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateWithoutTaskSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUncheckedUpdateManyWithoutInstallationNestedInput
    users?: UserUncheckedUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutInstallationNestedInput
  }

  export type TaskActivityUpsertWithWhereUniqueWithoutTaskSubmissionInput = {
    where: TaskActivityWhereUniqueInput
    update: XOR<TaskActivityUpdateWithoutTaskSubmissionInput, TaskActivityUncheckedUpdateWithoutTaskSubmissionInput>
    create: XOR<TaskActivityCreateWithoutTaskSubmissionInput, TaskActivityUncheckedCreateWithoutTaskSubmissionInput>
  }

  export type TaskActivityUpdateWithWhereUniqueWithoutTaskSubmissionInput = {
    where: TaskActivityWhereUniqueInput
    data: XOR<TaskActivityUpdateWithoutTaskSubmissionInput, TaskActivityUncheckedUpdateWithoutTaskSubmissionInput>
  }

  export type TaskActivityUpdateManyWithWhereWithoutTaskSubmissionInput = {
    where: TaskActivityScalarWhereInput
    data: XOR<TaskActivityUpdateManyMutationInput, TaskActivityUncheckedUpdateManyWithoutTaskSubmissionInput>
  }

  export type TaskCreateWithoutTaskActivitiesInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserCreateNestedManyWithoutTasksAppliedForInput
    creator: UserCreateNestedOneWithoutCreatedTasksInput
    contributor?: UserCreateNestedOneWithoutContributedTasksInput
    installation: InstallationCreateNestedOneWithoutTasksInput
    transactions?: TransactionCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutTaskActivitiesInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserUncheckedCreateNestedManyWithoutTasksAppliedForInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutTaskInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutTaskActivitiesInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutTaskActivitiesInput, TaskUncheckedCreateWithoutTaskActivitiesInput>
  }

  export type UserCreateWithoutTaskActivitiesInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTaskActivitiesInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTaskActivitiesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTaskActivitiesInput, UserUncheckedCreateWithoutTaskActivitiesInput>
  }

  export type TaskSubmissionCreateWithoutTaskActivitiesInput = {
    id?: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTaskSubmissionsInput
    task: TaskCreateNestedOneWithoutTaskSubmissionsInput
    installation: InstallationCreateNestedOneWithoutTaskSubmissionsInput
  }

  export type TaskSubmissionUncheckedCreateWithoutTaskActivitiesInput = {
    id?: string
    userId: string
    taskId: string
    installationId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskSubmissionCreateOrConnectWithoutTaskActivitiesInput = {
    where: TaskSubmissionWhereUniqueInput
    create: XOR<TaskSubmissionCreateWithoutTaskActivitiesInput, TaskSubmissionUncheckedCreateWithoutTaskActivitiesInput>
  }

  export type TaskUpsertWithoutTaskActivitiesInput = {
    update: XOR<TaskUpdateWithoutTaskActivitiesInput, TaskUncheckedUpdateWithoutTaskActivitiesInput>
    create: XOR<TaskCreateWithoutTaskActivitiesInput, TaskUncheckedCreateWithoutTaskActivitiesInput>
    where?: TaskWhereInput
  }

  export type TaskUpdateToOneWithWhereWithoutTaskActivitiesInput = {
    where?: TaskWhereInput
    data: XOR<TaskUpdateWithoutTaskActivitiesInput, TaskUncheckedUpdateWithoutTaskActivitiesInput>
  }

  export type TaskUpdateWithoutTaskActivitiesInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUpdateManyWithoutTasksAppliedForNestedInput
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    contributor?: UserUpdateOneWithoutContributedTasksNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTasksNestedInput
    transactions?: TransactionUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutTaskActivitiesInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type UserUpsertWithoutTaskActivitiesInput = {
    update: XOR<UserUpdateWithoutTaskActivitiesInput, UserUncheckedUpdateWithoutTaskActivitiesInput>
    create: XOR<UserCreateWithoutTaskActivitiesInput, UserUncheckedCreateWithoutTaskActivitiesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTaskActivitiesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTaskActivitiesInput, UserUncheckedUpdateWithoutTaskActivitiesInput>
  }

  export type UserUpdateWithoutTaskActivitiesInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTaskActivitiesInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TaskSubmissionUpsertWithoutTaskActivitiesInput = {
    update: XOR<TaskSubmissionUpdateWithoutTaskActivitiesInput, TaskSubmissionUncheckedUpdateWithoutTaskActivitiesInput>
    create: XOR<TaskSubmissionCreateWithoutTaskActivitiesInput, TaskSubmissionUncheckedCreateWithoutTaskActivitiesInput>
    where?: TaskSubmissionWhereInput
  }

  export type TaskSubmissionUpdateToOneWithWhereWithoutTaskActivitiesInput = {
    where?: TaskSubmissionWhereInput
    data: XOR<TaskSubmissionUpdateWithoutTaskActivitiesInput, TaskSubmissionUncheckedUpdateWithoutTaskActivitiesInput>
  }

  export type TaskSubmissionUpdateWithoutTaskActivitiesInput = {
    id?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    task?: TaskUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTaskSubmissionsNestedInput
  }

  export type TaskSubmissionUncheckedUpdateWithoutTaskActivitiesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserInstallationPermissionCreateWithoutPermissionsInput = {
    id?: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
    user: UserCreateNestedOneWithoutUserInstallationPermissionsInput
    installation: InstallationCreateNestedOneWithoutUserInstallationPermissionsInput
  }

  export type UserInstallationPermissionUncheckedCreateWithoutPermissionsInput = {
    id?: string
    userId: string
    installationId: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
  }

  export type UserInstallationPermissionCreateOrConnectWithoutPermissionsInput = {
    where: UserInstallationPermissionWhereUniqueInput
    create: XOR<UserInstallationPermissionCreateWithoutPermissionsInput, UserInstallationPermissionUncheckedCreateWithoutPermissionsInput>
  }

  export type UserInstallationPermissionUpsertWithWhereUniqueWithoutPermissionsInput = {
    where: UserInstallationPermissionWhereUniqueInput
    update: XOR<UserInstallationPermissionUpdateWithoutPermissionsInput, UserInstallationPermissionUncheckedUpdateWithoutPermissionsInput>
    create: XOR<UserInstallationPermissionCreateWithoutPermissionsInput, UserInstallationPermissionUncheckedCreateWithoutPermissionsInput>
  }

  export type UserInstallationPermissionUpdateWithWhereUniqueWithoutPermissionsInput = {
    where: UserInstallationPermissionWhereUniqueInput
    data: XOR<UserInstallationPermissionUpdateWithoutPermissionsInput, UserInstallationPermissionUncheckedUpdateWithoutPermissionsInput>
  }

  export type UserInstallationPermissionUpdateManyWithWhereWithoutPermissionsInput = {
    where: UserInstallationPermissionScalarWhereInput
    data: XOR<UserInstallationPermissionUpdateManyMutationInput, UserInstallationPermissionUncheckedUpdateManyWithoutPermissionsInput>
  }

  export type UserCreateWithoutUserInstallationPermissionsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutUserInstallationPermissionsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutUserInstallationPermissionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUserInstallationPermissionsInput, UserUncheckedCreateWithoutUserInstallationPermissionsInput>
  }

  export type InstallationCreateWithoutUserInstallationPermissionsInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptionPackage?: SubscriptionPackageCreateNestedOneWithoutInstallationsInput
    tasks?: TaskCreateNestedManyWithoutInstallationInput
    users?: UserCreateNestedManyWithoutInstallationsInput
    transactions?: TransactionCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUncheckedCreateWithoutUserInstallationPermissionsInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskUncheckedCreateNestedManyWithoutInstallationInput
    users?: UserUncheckedCreateNestedManyWithoutInstallationsInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutInstallationInput
  }

  export type InstallationCreateOrConnectWithoutUserInstallationPermissionsInput = {
    where: InstallationWhereUniqueInput
    create: XOR<InstallationCreateWithoutUserInstallationPermissionsInput, InstallationUncheckedCreateWithoutUserInstallationPermissionsInput>
  }

  export type PermissionCreateWithoutUserInstallationPermissionsInput = {
    code: string
    name: string
    isDefault: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PermissionUncheckedCreateWithoutUserInstallationPermissionsInput = {
    code: string
    name: string
    isDefault: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PermissionCreateOrConnectWithoutUserInstallationPermissionsInput = {
    where: PermissionWhereUniqueInput
    create: XOR<PermissionCreateWithoutUserInstallationPermissionsInput, PermissionUncheckedCreateWithoutUserInstallationPermissionsInput>
  }

  export type UserUpsertWithoutUserInstallationPermissionsInput = {
    update: XOR<UserUpdateWithoutUserInstallationPermissionsInput, UserUncheckedUpdateWithoutUserInstallationPermissionsInput>
    create: XOR<UserCreateWithoutUserInstallationPermissionsInput, UserUncheckedCreateWithoutUserInstallationPermissionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUserInstallationPermissionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUserInstallationPermissionsInput, UserUncheckedUpdateWithoutUserInstallationPermissionsInput>
  }

  export type UserUpdateWithoutUserInstallationPermissionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutUserInstallationPermissionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type InstallationUpsertWithoutUserInstallationPermissionsInput = {
    update: XOR<InstallationUpdateWithoutUserInstallationPermissionsInput, InstallationUncheckedUpdateWithoutUserInstallationPermissionsInput>
    create: XOR<InstallationCreateWithoutUserInstallationPermissionsInput, InstallationUncheckedCreateWithoutUserInstallationPermissionsInput>
    where?: InstallationWhereInput
  }

  export type InstallationUpdateToOneWithWhereWithoutUserInstallationPermissionsInput = {
    where?: InstallationWhereInput
    data: XOR<InstallationUpdateWithoutUserInstallationPermissionsInput, InstallationUncheckedUpdateWithoutUserInstallationPermissionsInput>
  }

  export type InstallationUpdateWithoutUserInstallationPermissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptionPackage?: SubscriptionPackageUpdateOneWithoutInstallationsNestedInput
    tasks?: TaskUpdateManyWithoutInstallationNestedInput
    users?: UserUpdateManyWithoutInstallationsNestedInput
    transactions?: TransactionUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateWithoutUserInstallationPermissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUncheckedUpdateManyWithoutInstallationNestedInput
    users?: UserUncheckedUpdateManyWithoutInstallationsNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutInstallationNestedInput
  }

  export type PermissionUpsertWithWhereUniqueWithoutUserInstallationPermissionsInput = {
    where: PermissionWhereUniqueInput
    update: XOR<PermissionUpdateWithoutUserInstallationPermissionsInput, PermissionUncheckedUpdateWithoutUserInstallationPermissionsInput>
    create: XOR<PermissionCreateWithoutUserInstallationPermissionsInput, PermissionUncheckedCreateWithoutUserInstallationPermissionsInput>
  }

  export type PermissionUpdateWithWhereUniqueWithoutUserInstallationPermissionsInput = {
    where: PermissionWhereUniqueInput
    data: XOR<PermissionUpdateWithoutUserInstallationPermissionsInput, PermissionUncheckedUpdateWithoutUserInstallationPermissionsInput>
  }

  export type PermissionUpdateManyWithWhereWithoutUserInstallationPermissionsInput = {
    where: PermissionScalarWhereInput
    data: XOR<PermissionUpdateManyMutationInput, PermissionUncheckedUpdateManyWithoutUserInstallationPermissionsInput>
  }

  export type PermissionScalarWhereInput = {
    AND?: PermissionScalarWhereInput | PermissionScalarWhereInput[]
    OR?: PermissionScalarWhereInput[]
    NOT?: PermissionScalarWhereInput | PermissionScalarWhereInput[]
    code?: StringFilter<"Permission"> | string
    name?: StringFilter<"Permission"> | string
    isDefault?: BoolFilter<"Permission"> | boolean
    createdAt?: DateTimeFilter<"Permission"> | Date | string
    updatedAt?: DateTimeFilter<"Permission"> | Date | string
  }

  export type TaskCreateWithoutTransactionsInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserCreateNestedManyWithoutTasksAppliedForInput
    creator: UserCreateNestedOneWithoutCreatedTasksInput
    contributor?: UserCreateNestedOneWithoutContributedTasksInput
    installation: InstallationCreateNestedOneWithoutTasksInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutTransactionsInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    applications?: UserUncheckedCreateNestedManyWithoutTasksAppliedForInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutTaskInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutTransactionsInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutTransactionsInput, TaskUncheckedCreateWithoutTransactionsInput>
  }

  export type InstallationCreateWithoutTransactionsInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptionPackage?: SubscriptionPackageCreateNestedOneWithoutInstallationsInput
    tasks?: TaskCreateNestedManyWithoutInstallationInput
    users?: UserCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutInstallationInput
  }

  export type InstallationUncheckedCreateWithoutTransactionsInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    subscriptionPackageId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskUncheckedCreateNestedManyWithoutInstallationInput
    users?: UserUncheckedCreateNestedManyWithoutInstallationsInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutInstallationInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutInstallationInput
  }

  export type InstallationCreateOrConnectWithoutTransactionsInput = {
    where: InstallationWhereUniqueInput
    create: XOR<InstallationCreateWithoutTransactionsInput, InstallationUncheckedCreateWithoutTransactionsInput>
  }

  export type UserCreateWithoutTransactionsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryCreateNestedOneWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskCreateNestedManyWithoutContributorInput
    installations?: InstallationCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTransactionsInput = {
    userId: string
    username: string
    walletAddress: string
    walletSecret: string
    addressBook?: UserCreateaddressBookInput | InputJsonValue[]
    createdAt?: Date | string
    updatedAt?: Date | string
    contributionSummary?: ContributionSummaryUncheckedCreateNestedOneWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    contributedTasks?: TaskUncheckedCreateNestedManyWithoutContributorInput
    installations?: InstallationUncheckedCreateNestedManyWithoutUsersInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedCreateNestedManyWithoutUserInput
    tasksAppliedFor?: TaskUncheckedCreateNestedManyWithoutApplicationsInput
    taskSubmissions?: TaskSubmissionUncheckedCreateNestedManyWithoutUserInput
    taskActivities?: TaskActivityUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTransactionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
  }

  export type TaskUpsertWithoutTransactionsInput = {
    update: XOR<TaskUpdateWithoutTransactionsInput, TaskUncheckedUpdateWithoutTransactionsInput>
    create: XOR<TaskCreateWithoutTransactionsInput, TaskUncheckedCreateWithoutTransactionsInput>
    where?: TaskWhereInput
  }

  export type TaskUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: TaskWhereInput
    data: XOR<TaskUpdateWithoutTransactionsInput, TaskUncheckedUpdateWithoutTransactionsInput>
  }

  export type TaskUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUpdateManyWithoutTasksAppliedForNestedInput
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    contributor?: UserUpdateOneWithoutContributedTasksNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTasksNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type InstallationUpsertWithoutTransactionsInput = {
    update: XOR<InstallationUpdateWithoutTransactionsInput, InstallationUncheckedUpdateWithoutTransactionsInput>
    create: XOR<InstallationCreateWithoutTransactionsInput, InstallationUncheckedCreateWithoutTransactionsInput>
    where?: InstallationWhereInput
  }

  export type InstallationUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: InstallationWhereInput
    data: XOR<InstallationUpdateWithoutTransactionsInput, InstallationUncheckedUpdateWithoutTransactionsInput>
  }

  export type InstallationUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptionPackage?: SubscriptionPackageUpdateOneWithoutInstallationsNestedInput
    tasks?: TaskUpdateManyWithoutInstallationNestedInput
    users?: UserUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUncheckedUpdateManyWithoutInstallationNestedInput
    users?: UserUncheckedUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutInstallationNestedInput
  }

  export type UserUpsertWithoutTransactionsInput = {
    update: XOR<UserUpdateWithoutTransactionsInput, UserUncheckedUpdateWithoutTransactionsInput>
    create: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTransactionsInput, UserUncheckedUpdateWithoutTransactionsInput>
  }

  export type UserUpdateWithoutTransactionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTransactionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TaskCreateManyCreatorInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    contributorId?: string | null
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskCreateManyContributorInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    installationId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserInstallationPermissionCreateManyUserInput = {
    id?: string
    installationId: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
  }

  export type TransactionCreateManyUserInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    taskId?: string | null
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    installationId?: string | null
  }

  export type TaskSubmissionCreateManyUserInput = {
    id?: string
    taskId: string
    installationId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityCreateManyUserInput = {
    id?: string
    taskId: string
    taskSubmissionId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUpdateManyWithoutTasksAppliedForNestedInput
    contributor?: UserUpdateOneWithoutContributedTasksNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTasksNestedInput
    transactions?: TransactionUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateManyWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUpdateWithoutContributorInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUpdateManyWithoutTasksAppliedForNestedInput
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTasksNestedInput
    transactions?: TransactionUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutContributorInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateManyWithoutContributorInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallationUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptionPackage?: SubscriptionPackageUpdateOneWithoutInstallationsNestedInput
    tasks?: TaskUpdateManyWithoutInstallationNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUncheckedUpdateManyWithoutInstallationNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateManyWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    subscriptionPackageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserInstallationPermissionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    installation?: InstallationUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput
    permissions?: PermissionUpdateManyWithoutUserInstallationPermissionsNestedInput
  }

  export type UserInstallationPermissionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    permissions?: PermissionUncheckedUpdateManyWithoutUserInstallationPermissionsNestedInput
  }

  export type UserInstallationPermissionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    task?: TaskUpdateOneWithoutTransactionsNestedInput
    installation?: InstallationUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    installationId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TransactionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    installationId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskUpdateWithoutApplicationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    contributor?: UserUpdateOneWithoutContributedTasksNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTasksNestedInput
    transactions?: TransactionUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutApplicationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateManyWithoutApplicationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    installationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskSubmissionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    task?: TaskUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    task?: TaskUpdateOneRequiredWithoutTaskActivitiesNestedInput
    taskSubmission?: TaskSubmissionUpdateOneWithoutTaskActivitiesNestedInput
  }

  export type TaskActivityUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    taskSubmissionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    taskSubmissionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallationCreateManySubscriptionPackageInput = {
    id: string
    htmlUrl: string
    targetId: number
    targetType: string
    account: JsonNullValueInput | InputJsonValue
    walletAddress: string
    walletSecret: string
    escrowAddress: string
    escrowSecret: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstallationUpdateWithoutSubscriptionPackageInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUpdateManyWithoutInstallationNestedInput
    users?: UserUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateWithoutSubscriptionPackageInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUncheckedUpdateManyWithoutInstallationNestedInput
    users?: UserUncheckedUpdateManyWithoutInstallationsNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutInstallationNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutInstallationNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutInstallationNestedInput
  }

  export type InstallationUncheckedUpdateManyWithoutSubscriptionPackageInput = {
    id?: StringFieldUpdateOperationsInput | string
    htmlUrl?: StringFieldUpdateOperationsInput | string
    targetId?: IntFieldUpdateOperationsInput | number
    targetType?: StringFieldUpdateOperationsInput | string
    account?: JsonNullValueInput | InputJsonValue
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    escrowAddress?: StringFieldUpdateOperationsInput | string
    escrowSecret?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCreateManyInstallationInput = {
    id?: string
    issue: JsonNullValueInput | InputJsonValue
    timeline?: number | null
    timelineType?: $Enums.TimelineType | null
    bounty?: number
    status?: $Enums.TaskStatus
    settled?: boolean
    acceptedAt?: Date | string | null
    completedAt?: Date | string | null
    creatorId: string
    contributorId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserInstallationPermissionCreateManyInstallationInput = {
    id?: string
    userId: string
    permissionCodes?: UserInstallationPermissionCreatepermissionCodesInput | string[]
    assignedBy?: string | null
    assignedAt?: Date | string
  }

  export type TransactionCreateManyInstallationInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    taskId?: string | null
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    userId?: string | null
  }

  export type TaskSubmissionCreateManyInstallationInput = {
    id?: string
    userId: string
    taskId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUpdateManyWithoutTasksAppliedForNestedInput
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    contributor?: UserUpdateOneWithoutContributedTasksNestedInput
    transactions?: TransactionUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    applications?: UserUncheckedUpdateManyWithoutTasksAppliedForNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutTaskNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutTaskNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateManyWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    issue?: JsonNullValueInput | InputJsonValue
    timeline?: NullableFloatFieldUpdateOperationsInput | number | null
    timelineType?: NullableEnumTimelineTypeFieldUpdateOperationsInput | $Enums.TimelineType | null
    bounty?: FloatFieldUpdateOperationsInput | number
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus
    settled?: BoolFieldUpdateOperationsInput | boolean
    acceptedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creatorId?: StringFieldUpdateOperationsInput | string
    contributorId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUpdateWithoutInstallationsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutInstallationsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    tasksAppliedFor?: TaskUncheckedUpdateManyWithoutApplicationsNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateManyWithoutInstallationsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserInstallationPermissionUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput
    permissions?: PermissionUpdateManyWithoutUserInstallationPermissionsNestedInput
  }

  export type UserInstallationPermissionUncheckedUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    permissions?: PermissionUncheckedUpdateManyWithoutUserInstallationPermissionsNestedInput
  }

  export type UserInstallationPermissionUncheckedUpdateManyWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    task?: TaskUpdateOneWithoutTransactionsNestedInput
    user?: UserUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TransactionUncheckedUpdateManyWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskSubmissionUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    task?: TaskUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionUncheckedUpdateWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionUncheckedUpdateManyWithoutInstallationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyTaskInput = {
    id?: string
    txHash: string
    category: $Enums.TransactionCategory
    amount: number
    doneAt?: Date | string
    sourceAddress?: string | null
    destinationAddress?: string | null
    asset?: string | null
    assetFrom?: string | null
    assetTo?: string | null
    fromAmount?: number | null
    toAmount?: number | null
    installationId?: string | null
    userId?: string | null
  }

  export type TaskSubmissionCreateManyTaskInput = {
    id?: string
    userId: string
    installationId: string
    pullRequest: string
    attachmentUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityCreateManyTaskInput = {
    id?: string
    userId?: string | null
    taskSubmissionId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateWithoutTasksAppliedForInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUpdateManyWithoutContributorNestedInput
    installations?: InstallationUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    taskSubmissions?: TaskSubmissionUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTasksAppliedForInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contributionSummary?: ContributionSummaryUncheckedUpdateOneWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    contributedTasks?: TaskUncheckedUpdateManyWithoutContributorNestedInput
    installations?: InstallationUncheckedUpdateManyWithoutUsersNestedInput
    userInstallationPermissions?: UserInstallationPermissionUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    taskSubmissions?: TaskSubmissionUncheckedUpdateManyWithoutUserNestedInput
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateManyWithoutTasksAppliedForInput = {
    userId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    walletAddress?: StringFieldUpdateOperationsInput | string
    walletSecret?: StringFieldUpdateOperationsInput | string
    addressBook?: UserUpdateaddressBookInput | InputJsonValue[]
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    installation?: InstallationUpdateOneWithoutTransactionsNestedInput
    user?: UserUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    installationId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TransactionUncheckedUpdateManyWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    txHash?: StringFieldUpdateOperationsInput | string
    category?: EnumTransactionCategoryFieldUpdateOperationsInput | $Enums.TransactionCategory
    amount?: FloatFieldUpdateOperationsInput | number
    doneAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceAddress?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    asset?: NullableStringFieldUpdateOperationsInput | string | null
    assetFrom?: NullableStringFieldUpdateOperationsInput | string | null
    assetTo?: NullableStringFieldUpdateOperationsInput | string | null
    fromAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    toAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    installationId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskSubmissionUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    installation?: InstallationUpdateOneRequiredWithoutTaskSubmissionsNestedInput
    taskActivities?: TaskActivityUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionUncheckedUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    taskActivities?: TaskActivityUncheckedUpdateManyWithoutTaskSubmissionNestedInput
  }

  export type TaskSubmissionUncheckedUpdateManyWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    pullRequest?: StringFieldUpdateOperationsInput | string
    attachmentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutTaskActivitiesNestedInput
    taskSubmission?: TaskSubmissionUpdateOneWithoutTaskActivitiesNestedInput
  }

  export type TaskActivityUncheckedUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    taskSubmissionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityUncheckedUpdateManyWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    taskSubmissionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityCreateManyTaskSubmissionInput = {
    id?: string
    taskId: string
    userId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskActivityUpdateWithoutTaskSubmissionInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    task?: TaskUpdateOneRequiredWithoutTaskActivitiesNestedInput
    user?: UserUpdateOneWithoutTaskActivitiesNestedInput
  }

  export type TaskActivityUncheckedUpdateWithoutTaskSubmissionInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskActivityUncheckedUpdateManyWithoutTaskSubmissionInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserInstallationPermissionUpdateWithoutPermissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput
    installation?: InstallationUpdateOneRequiredWithoutUserInstallationPermissionsNestedInput
  }

  export type UserInstallationPermissionUncheckedUpdateWithoutPermissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserInstallationPermissionUncheckedUpdateManyWithoutPermissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    installationId?: StringFieldUpdateOperationsInput | string
    permissionCodes?: UserInstallationPermissionUpdatepermissionCodesInput | string[]
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermissionUpdateWithoutUserInstallationPermissionsInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermissionUncheckedUpdateWithoutUserInstallationPermissionsInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermissionUncheckedUpdateManyWithoutUserInstallationPermissionsInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}