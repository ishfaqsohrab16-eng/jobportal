import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  AdminOverview,
  ApiKeyCreateInput,
  ApiKeyDTO,
  ApplicationDTO,
  ApplicationStatus,
  ApplyInput,
  LoginInput,
  OpportunityDTO,
  OpportunityInput,
  OpportunityStatus,
  OpportunityType,
  OrganizationDTO,
  OrganizationInput,
  Paginated,
  ProfileInput,
  PublicStats,
  RegisterInput,
  UserDTO,
} from "@digibizz/jobs-shared";

type Params = Record<string, string | number | undefined | null>;

/** Drop empty values so the cache key and URL stay clean. */
const clean = (p: Params = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export interface Facets {
  cities: { value: string; count: number }[];
  fields: { value: string; count: number }[];
  categories: { value: string; count: number }[];
  workModes: { value: string; count: number }[];
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api", credentials: "include" }),
  tagTypes: ["Me", "Opportunity", "Organization", "Saved", "Application", "ApiKey", "Stats", "Overview", "Candidate"],
  endpoints: (b) => ({
    /* ------------------------------------------------------------ public */
    stats: b.query<PublicStats, void>({ query: () => "/stats", providesTags: ["Stats"] }),
    facets: b.query<Facets, OpportunityType | undefined>({
      query: (type) => ({ url: "/facets", params: clean({ type }) }),
    }),
    opportunities: b.query<Paginated<OpportunityDTO>, Params>({
      query: (params) => ({ url: "/opportunities", params: clean(params) }),
      providesTags: (r) => [...(r?.items.map((o) => ({ type: "Opportunity" as const, id: o.id })) ?? []), { type: "Opportunity", id: "LIST" }],
    }),
    opportunity: b.query<OpportunityDTO, string>({
      query: (slug) => `/opportunities/${slug}`,
      providesTags: (r) => (r ? [{ type: "Opportunity", id: r.id }, "Me"] : []),
    }),
    similar: b.query<OpportunityDTO[], string>({ query: (slug) => `/opportunities/${slug}/similar` }),
    organizations: b.query<OrganizationDTO[], void>({ query: () => "/organizations", providesTags: ["Organization"] }),
    organization: b.query<{ organization: OrganizationDTO; opportunities: OpportunityDTO[] }, string>({
      query: (slug) => `/organizations/${slug}`,
      providesTags: ["Organization"],
    }),

    /* -------------------------------------------------------------- auth */
    me: b.query<{ user: UserDTO }, void>({ query: () => "/auth/me", providesTags: ["Me"] }),
    login: b.mutation<{ user: UserDTO }, LoginInput>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Me", "Saved", "Application", "Opportunity"],
    }),
    register: b.mutation<{ user: UserDTO }, RegisterInput>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    logout: b.mutation<void, void>({ query: () => ({ url: "/auth/logout", method: "POST" }) }),
    changePassword: b.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: "/auth/password", method: "POST", body }),
    }),

    /* ---------------------------------------------------------- candidate */
    updateProfile: b.mutation<{ user: UserDTO }, ProfileInput>({
      query: (body) => ({ url: "/me/profile", method: "PUT", body }),
      invalidatesTags: ["Me"],
    }),
    uploadResume: b.mutation<{ user: UserDTO }, File>({
      query: (file) => {
        const body = new FormData();
        body.append("resume", file);
        return { url: "/me/resume", method: "PUT", body };
      },
      invalidatesTags: ["Me"],
    }),
    deleteResume: b.mutation<{ user: UserDTO }, void>({
      query: () => ({ url: "/me/resume", method: "DELETE" }),
      invalidatesTags: ["Me"],
    }),
    saved: b.query<OpportunityDTO[], void>({ query: () => "/me/saved", providesTags: ["Saved"] }),
    toggleSave: b.mutation<void, { id: string; save: boolean }>({
      query: ({ id, save }) => ({ url: `/me/saved/${id}`, method: save ? "PUT" : "DELETE" }),
      invalidatesTags: (_r, _e, { id }) => ["Saved", { type: "Opportunity", id }],
    }),
    myApplications: b.query<ApplicationDTO[], void>({ query: () => "/me/applications", providesTags: ["Application"] }),
    apply: b.mutation<ApplicationDTO, { id: string; body: ApplyInput }>({
      query: ({ id, body }) => ({ url: `/me/applications/${id}`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => ["Application", { type: "Opportunity", id }],
    }),
    withdraw: b.mutation<ApplicationDTO, string>({
      query: (id) => ({ url: `/me/applications/${id}/withdraw`, method: "POST" }),
      invalidatesTags: ["Application", "Opportunity"],
    }),

    /* -------------------------------------------------------------- admin */
    overview: b.query<AdminOverview, void>({ query: () => "/admin/overview", providesTags: ["Overview"] }),
    adminOpportunities: b.query<Paginated<OpportunityDTO>, Params>({
      query: (params) => ({ url: "/admin/opportunities", params: clean(params) }),
      providesTags: [{ type: "Opportunity", id: "ADMIN" }],
    }),
    adminOpportunity: b.query<OpportunityDTO, string>({
      query: (id) => `/admin/opportunities/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Opportunity", id }],
    }),
    saveOpportunity: b.mutation<OpportunityDTO, { id?: string; body: OpportunityInput }>({
      query: ({ id, body }) => ({ url: id ? `/admin/opportunities/${id}` : "/admin/opportunities", method: id ? "PUT" : "POST", body }),
      invalidatesTags: ["Opportunity", "Stats", "Overview"],
    }),
    setOpportunityStatus: b.mutation<OpportunityDTO, { id: string; status: OpportunityStatus }>({
      query: ({ id, status }) => ({ url: `/admin/opportunities/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["Opportunity", "Stats", "Overview"],
    }),
    duplicateOpportunity: b.mutation<OpportunityDTO, string>({
      query: (id) => ({ url: `/admin/opportunities/${id}/duplicate`, method: "POST" }),
      invalidatesTags: ["Opportunity"],
    }),
    deleteOpportunity: b.mutation<void, string>({
      query: (id) => ({ url: `/admin/opportunities/${id}`, method: "DELETE" }),
      invalidatesTags: ["Opportunity", "Stats", "Overview"],
    }),
    adminOrganizations: b.query<OrganizationDTO[], void>({ query: () => "/admin/organizations", providesTags: ["Organization"] }),
    saveOrganization: b.mutation<OrganizationDTO, { id?: string; body: OrganizationInput }>({
      query: ({ id, body }) => ({ url: id ? `/admin/organizations/${id}` : "/admin/organizations", method: id ? "PUT" : "POST", body }),
      invalidatesTags: ["Organization", "Opportunity"],
    }),
    uploadLogo: b.mutation<OrganizationDTO, { id: string; file: File }>({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append("logo", file);
        return { url: `/admin/organizations/${id}/logo`, method: "POST", body };
      },
      invalidatesTags: ["Organization", "Opportunity"],
    }),
    deleteOrganization: b.mutation<void, string>({
      query: (id) => ({ url: `/admin/organizations/${id}`, method: "DELETE" }),
      invalidatesTags: ["Organization"],
    }),
    adminApplications: b.query<Paginated<ApplicationDTO>, Params>({
      query: (params) => ({ url: "/admin/applications", params: clean(params) }),
      providesTags: ["Application"],
    }),
    setApplicationStatus: b.mutation<ApplicationDTO, { id: string; status: ApplicationStatus; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/applications/${id}/status`, method: "PATCH", body }),
      invalidatesTags: ["Application", "Overview"],
    }),
    candidates: b.query<Paginated<UserDTO>, Params>({
      query: (params) => ({ url: "/admin/candidates", params: clean(params) }),
      providesTags: ["Candidate"],
    }),
    apiKeys: b.query<ApiKeyDTO[], void>({ query: () => "/admin/api-keys", providesTags: ["ApiKey"] }),
    createApiKey: b.mutation<{ key: ApiKeyDTO; secret: string }, ApiKeyCreateInput>({
      query: (body) => ({ url: "/admin/api-keys", method: "POST", body }),
      invalidatesTags: ["ApiKey"],
    }),
    revokeApiKey: b.mutation<ApiKeyDTO, string>({
      query: (id) => ({ url: `/admin/api-keys/${id}/revoke`, method: "POST" }),
      invalidatesTags: ["ApiKey"],
    }),
    apiKeyUsage: b.query<{ day: string; count: number }[], string>({
      query: (id) => `/admin/api-keys/${id}/usage`,
      providesTags: ["ApiKey"],
    }),
  }),
});

export const {
  useStatsQuery,
  useFacetsQuery,
  useOpportunitiesQuery,
  useOpportunityQuery,
  useSimilarQuery,
  useOrganizationsQuery,
  useOrganizationQuery,
  useMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useUpdateProfileMutation,
  useUploadResumeMutation,
  useDeleteResumeMutation,
  useSavedQuery,
  useToggleSaveMutation,
  useMyApplicationsQuery,
  useApplyMutation,
  useWithdrawMutation,
  useOverviewQuery,
  useAdminOpportunitiesQuery,
  useAdminOpportunityQuery,
  useSaveOpportunityMutation,
  useSetOpportunityStatusMutation,
  useDuplicateOpportunityMutation,
  useDeleteOpportunityMutation,
  useAdminOrganizationsQuery,
  useSaveOrganizationMutation,
  useUploadLogoMutation,
  useDeleteOrganizationMutation,
  useAdminApplicationsQuery,
  useSetApplicationStatusMutation,
  useCandidatesQuery,
  useApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
  useApiKeyUsageQuery,
} = api;
