export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt((query.page as string) || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) || "50") || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
