/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as block_modules from "../block_modules.js";
import type * as blocks from "../blocks.js";
import type * as defects from "../defects.js";
import type * as development_types from "../development_types.js";
import type * as getUserActivities from "../getUserActivities.js";
import type * as module_tasks from "../module_tasks.js";
import type * as modules from "../modules.js";
import type * as projects from "../projects.js";
import type * as providers from "../providers.js";
import type * as reports from "../reports.js";
import type * as reports_defects from "../reports_defects.js";
import type * as seed from "../seed.js";
import type * as task_activities from "../task_activities.js";
import type * as team_members from "../team_members.js";
import type * as teams from "../teams.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  block_modules: typeof block_modules;
  blocks: typeof blocks;
  defects: typeof defects;
  development_types: typeof development_types;
  getUserActivities: typeof getUserActivities;
  module_tasks: typeof module_tasks;
  modules: typeof modules;
  projects: typeof projects;
  providers: typeof providers;
  reports: typeof reports;
  reports_defects: typeof reports_defects;
  seed: typeof seed;
  task_activities: typeof task_activities;
  team_members: typeof team_members;
  teams: typeof teams;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
