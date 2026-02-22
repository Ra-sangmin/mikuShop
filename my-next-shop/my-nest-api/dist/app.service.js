"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const applicationId = '0ce6d58d-6e1e-4218-896a-abf6ac69a11d';
const accessKey = 'pk_5ug4iHg98WLU0S76RBMdDOkVwnVwYpkJpMifIjpbLjG';
const affiliateId = '50fdea06.db679051.50fdea07.dd391918';
const originUrl = 'https://proteolytic-karon-nontemperately.ngrok-free.dev';
let AppService = AppService_1 = class AppService {
    httpService;
    logger = new common_1.Logger(AppService_1.name);
    rakutenCache = new Map();
    lastRequestTime = 0;
    MIN_INTERVAL = 500;
    constructor(httpService) {
        this.httpService = httpService;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async rakutenBaseAPIOn(cacheKey, tailUrl, genreId, page = 1, sort = 'standard', retries = 3) {
        if (this.rakutenCache.has(cacheKey)) {
            return this.rakutenCache.get(cacheKey).data;
        }
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_INTERVAL) {
            const waitTime = this.MIN_INTERVAL - timeSinceLastRequest;
            this.logger.debug(`연속 요청 방지를 위해 ${waitTime}ms 동안 대기합니다.`);
            await this.delay(waitTime);
        }
        const API_URL = `https://openapi.rakuten.co.jp/${tailUrl}`;
        let attempt = 0;
        while (attempt < retries) {
            try {
                const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(API_URL, {
                    params: {
                        format: 'json',
                        formatVersion: 2,
                        applicationId,
                        accessKey,
                        affiliateId,
                        sort,
                        genreId,
                        page,
                        hits: 30,
                    },
                    headers: {
                        Origin: originUrl,
                    },
                }));
                this.lastRequestTime = Date.now();
                const resultToCache = { data: response.data };
                this.rakutenCache.set(cacheKey, resultToCache);
                return resultToCache.data;
            }
            catch (error) {
                this.lastRequestTime = Date.now();
                const axiosError = error;
                const status = axiosError.response?.status;
                const fullUrl = this.httpService.axiosRef.getUri(axiosError.config);
                if (status === 429 && attempt < retries - 1) {
                    attempt++;
                    const backoffTime = attempt * 1000;
                    this.logger.warn(`[429 에러] ${backoffTime}ms 후 재시도 합니다. (시도: ${attempt}/${retries})`);
                    await this.delay(backoffTime);
                    continue;
                }
                this.logger.error(`에러 발생 - 상태코드: ${status} | URL: ${fullUrl}`);
                break;
            }
        }
        return { Items: [], children: [], parents: [] };
    }
};
exports.AppService = AppService;
exports.AppService = AppService = AppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], AppService);
//# sourceMappingURL=app.service.js.map