// src/models/FeeManager.ts

export interface FeeSettings {
  TRANSFER: number;
  AGENCY: number;
}

class FeeManager {
  private static instance: FeeManager;
  private settings: FeeSettings = { TRANSFER: 450, AGENCY: 500 }; // 기본값(Fallback)
  private isLoaded: boolean = false;

  private constructor() {}

  public static getInstance(): FeeManager {
    if (!FeeManager.instance) {
      FeeManager.instance = new FeeManager();
    }
    return FeeManager.instance;
  }

  // DB에서 수수료 로드 (앱 초기화 시 1회 호출 권장)
  public async loadFees(): Promise<FeeSettings> {
    try {
      const res = await fetch('/api/fees');
      const data = await res.json();
      if (data.success && data.fees) {
        const dbSettings = data.fees.reduce((acc: any, fee: any) => {
          acc[fee.feeType] = Number(fee.amount);
          return acc;
        }, {});
        
        this.settings = { ...this.settings, ...dbSettings };
        this.isLoaded = true;
        console.log("[FeeManager] DB 수수료 로드 완료:", this.settings);
      }
    } catch (err) {
      console.error("[FeeManager] DB 로드 실패, 기본값 사용");
    }
    return this.settings;
  }

  public getFees(): FeeSettings {
    return this.settings;
  }

  public getIsLoaded(): boolean {
    return this.isLoaded;
  }
}

export const feeManager = FeeManager.getInstance();