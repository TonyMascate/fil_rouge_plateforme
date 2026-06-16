import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { User } from '@app/users/entities/user.entity';
import { Photo } from '@app/photo/entities/photo.entity';
import { Album } from '@app/album/entities/album.entity';
import { AlbumPhoto } from '@app/album/entities/album-photo.entity';
import { AlbumMember } from '@app/album/entities/album-member.entity';
import { RefreshToken } from '@app/auth/entities/refresh-token.entity';

let container: StartedPostgreSqlContainer;
let dataSource: DataSource;

export async function setupIntegrationDatabase(): Promise<DataSource> {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  dataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    entities: [User, Photo, Album, AlbumPhoto, AlbumMember, RefreshToken],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

export async function teardownIntegrationDatabase(): Promise<void> {
  if (dataSource?.isInitialized) await dataSource.destroy();
  await container?.stop();
}

// TRUNCATE CASCADE depuis users supprime tout par FK CASCADE
export async function clearTables(): Promise<void> {
  await dataSource.query('TRUNCATE TABLE users CASCADE');
}
