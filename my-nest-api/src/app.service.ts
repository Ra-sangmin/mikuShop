import { Injectable,Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { debug } from 'console';
import { AxiosError } from 'axios';

const applicationId = '0ce6d58d-6e1e-4218-896a-abf6ac69a11d';
const accessKey = 'pk_5ug4iHg98WLU0S76RBMdDOkVwnVwYpkJpMifIjpbLjG';
const affiliateId = '50fdea06.db679051.50fdea07.dd391918';
const originUrl = 'https://proteolytic-karon-nontemperately.ngrok-free.dev';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private rakutenCache = new Map<string, any>();
  
  // 마지막 요청 완료 시간을 저장할 변수 추가
  private lastRequestTime: number = 0;
  // 요청 간 최소 간격 (0.5초)
  private readonly MIN_INTERVAL = 500;

  constructor(private readonly httpService: HttpService) {}

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async rakutenBaseAPIOn(
    cacheKey: string,
    tailUrl: string,
    genreId: string,
    page: number = 1,
    sort: string = 'standard',
    retries: number = 3,
  ): Promise<any> {
    // 1. 캐시 확인 로직 (대기 없이 즉시 반환)
    if (this.rakutenCache.has(cacheKey)) {
      return this.rakutenCache.get(cacheKey).data;
    }

    // 2. 요청 간격 조절 (Rate Limiting)
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
        const response = await firstValueFrom(
          this.httpService.get(API_URL, {
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
          }),
        );

        // 요청 성공 시 시간 갱신
        this.lastRequestTime = Date.now();

        const resultToCache = { data: response.data };
        this.rakutenCache.set(cacheKey, resultToCache);
        
        return resultToCache.data;

      } catch (error) {
        // 에러 발생 시에도 요청 시간 갱신 (서버 부하 방지)
        this.lastRequestTime = Date.now();

        const axiosError = error as AxiosError;
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
}