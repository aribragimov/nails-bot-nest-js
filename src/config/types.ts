type BaseClientConfig = {
  companyId?: string;
  timeDataUrl?: string;
  oauth?: {
    url?: string;
    clientId?: string;
    clientSecret?: string;
  };
};

export enum AldoClientTypeEnum {
  MAIN = 'main',
  UAT = 'uat',
}

type ClientConfig = BaseClientConfig | Record<AldoClientTypeEnum, BaseClientConfig>;

export type Clients = 'aldo' | 'garda';

export type ClientsConfig = Record<Clients, ClientConfig>;
