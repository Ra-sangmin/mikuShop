import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class RakutenService {
    private readonly httpService;
    private readonly configService;
    constructor(httpService: HttpService, configService: ConfigService);
    getCategoryInfo(genreId: string): Promise<{
        parents: never[];
        current: {
            genreName: string;
        };
        children: never[];
    }>;
    searchItems(params: {
        genreId: string;
        sort: string;
        page: number;
    }): Promise<{
        items: never[];
        page: number;
        pageCount: number;
    }>;
}
