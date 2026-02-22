import { RakutenService } from './rakuten.service';
export declare class RakutenController {
    private readonly rakutenService;
    constructor(rakutenService: RakutenService);
    getCategories(genreId: string): Promise<{
        parents: never[];
        current: {
            genreName: string;
        };
        children: never[];
    }>;
    getItems(genreId: string, sort: string, page: string): Promise<{
        items: never[];
        page: number;
        pageCount: number;
    }>;
}
