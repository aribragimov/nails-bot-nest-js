import { DataSource, EntityTarget, ObjectLiteral, QueryRunner, Repository } from 'typeorm';

type Source = QueryRunner | DataSource;

const isQueryRunner = (source: Source): source is QueryRunner => true;
const isDataSource = (source: Source): source is DataSource => true;

export function getRepository<Entity extends ObjectLiteral>(
  source: Source,
  target: EntityTarget<Entity>,
): Repository<Entity> {
  if (isQueryRunner(source)) {
    return source.manager.getRepository(target);
  }

  if (isDataSource(source)) {
    return source.getRepository(target);
  }

  throw new Error('Unknown source');
}
