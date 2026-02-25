import { HttpService } from '@nestjs/axios';
export declare class AppService {
    private readonly httpService;
    private readonly logger;
    private rakutenCache;
    private lastRequestTime;
    private readonly MIN_INTERVAL;
    constructor(httpService: HttpService);
    private delay;
    rakutenBaseAPIOn(cacheKey: string, tailUrl: string, genreId: string, page?: number, sort?: string, retries?: number): Promise<any>;
}
