import { Id, RelationMappings } from 'objection';
import { Cuboid } from './Cuboid';
import Base from './Base';

export class Bag extends Base {
  id!: Id;
  volume!: number;
  title!: string;
  payloadVolume!: number;
  availableVolume!: number;
  cuboids?: Cuboid[] | undefined;

  static tableName = 'bags';

  async $beforeInsert(): Promise<void> {
    const hasCuboids =
      typeof this.cuboids !== 'undefined' && this.cuboids.length > 0;
    const volumes = hasCuboids
      ? this.cuboids?.map(
          (cuboid: Cuboid) => cuboid.width * cuboid.height * cuboid.depth
        )
      : [];
    const volumesAmount = volumes?.reduce(
      (accumulator: number, volume: number) => accumulator + volume,
      0
    );
    const payloadVolume = volumesAmount ? volumesAmount : 0;

    this.payloadVolume = payloadVolume;
    this.availableVolume = this.volume - payloadVolume;
  }

  static get relationMappings(): RelationMappings {
    return {
      cuboids: {
        relation: Base.HasManyRelation,
        modelClass: 'Cuboid',
        join: {
          from: 'bags.id',
          to: 'cuboids.bagId',
        },
      },
    };
  }
}

export default Bag;
