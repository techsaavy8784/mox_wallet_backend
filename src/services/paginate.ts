import { Request } from "express";
import { Query, Document, PipelineStage, Model } from "mongoose";
import { API_RESPONSE_PAGE_SIZE } from "../helpers/constants";
import Pagination from "../interfaces/pagination";

class PaginationService {
  public static async paginate(
    req: Request,
    model: Model<any>,
    query: Query<Document<any>[], any, {}, any>
  ) {
    // Pagination
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit =
      parseInt(req.query.limit as string, 10) || API_RESPONSE_PAGE_SIZE;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await model.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const results = await query;

    // Pagination result
    const pagination: Pagination = { current: page, limit, total };

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
        total,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
        total,
      };
    }

    return {
      data: results,
      count: results.length,
      pagination,
    };
  }

  public static async paginateAggregate(
    reqQuery: Request["query"],
    model: any,
    pipelines: PipelineStage[]
  ) {
    // Pagination
    const page = parseInt(reqQuery.page as string, 10) || 1;
    const limit =
      parseInt(reqQuery.limit as string, 10) || API_RESPONSE_PAGE_SIZE;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const days = new Date(
      new Date().getTime() -
        parseFloat((reqQuery.days as string) || "100") * 60 * 60 * 24 * 1000
    );
    const today = new Date(
      new Date().getTime() - parseFloat("0") * 60 * 60 * 24 * 1000
    );
    const from = new Date(reqQuery.from as string);
    const to = new Date(reqQuery.to as string);

    pipelines = [
      ...pipelines,
      { $skip: startIndex },
      { $limit: limit },
      {
        $match: {
          createdAt: {
            $gte: reqQuery.from ? from : days,
            $lte: reqQuery.to ? to : today,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          records: { $push: "$$ROOT" },
        },
      },
    ];

    const result = await model.aggregate(pipelines);
    const count = await model.countDocuments();

    const total = result.length == 1 ? result[0].total : 0;
    const records = result.length == 1 ? result[0].records : [];

    // Pagination result
    const pagination: Pagination = { current: page, limit, total };

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
        total,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
        total,
      };
    }

    return {
      data: records,
      count,
      pagination,
    };
  }
}

export default PaginationService;
