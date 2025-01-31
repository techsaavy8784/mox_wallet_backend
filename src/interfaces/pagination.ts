export default interface Pagination {
    current: number;
    limit: number;
    total: number;
    next?: {
      page: number;
      limit: number;
      total: number;
    };
    prev?: {
      page: number;
      limit: number;
      total: number;
    };
  }
  