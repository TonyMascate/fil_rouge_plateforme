import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDbConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    host: process.env.DB_HOST, // 'localhost' (Dev) ou 'pgbouncer' (Prod)
    port: parseInt(process.env.DB_PORT || '5432', 10), // 5432 (Dev) ou 6432 (Prod)
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    autoLoadEntities: true, // Ou [__dirname + '/../**/*.entity{.ts,.js}']

    // DANGER : True en dev (pratique), STRICTEMENT false en prod
    // En prod, tu utiliseras les Migrations TypeORM.
    synchronize: process.env.DB_SYNC === 'true',

    // --- CONFIGURATION SPÉCIFIQUE PGBOUNCER ---
    // Si on est en prod (donc derrière PgBouncer), il faut ajuster le pool
    poolSize: isProduction ? 5 : 20, 
    
    // Si PgBouncer est en mode "Transaction" (recommandé), 
    // les "prepared statements" peuvent causer des erreurs.
    // On les désactive souvent en prod pour la stabilité.
    ...(isProduction ? {
      extra: {
        max: 5, // Limite max de connexions physiques
        statement_timeout: 10000, // Timeout de sécurité
      }
    } : {}),
  };
};