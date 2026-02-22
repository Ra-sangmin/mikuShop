import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getCategories(genreId: string): Promise<{
        genreId: any;
        parents: any;
        current: any;
        children: any;
    }>;
    getItems(genreId: string, sort: string, page: number): Promise<{
        items: any;
        page: any;
        pageCount: any;
    }>;
}
