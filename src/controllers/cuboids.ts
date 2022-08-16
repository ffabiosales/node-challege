import { Request, Response } from 'express';
import * as HttpStatus from 'http-status-codes';
import { Id } from 'objection';

import { Bag, Cuboid } from '../models';

export const list = async (req: Request, res: Response): Promise<Response> => {
  const ids = req.query.ids as Id[];
  const cuboids = await Cuboid.query().findByIds(ids).withGraphFetched('bag');

  return res.status(200).json(cuboids);
};

export const get = async (req: Request, res: Response): Promise<Response> => {
  const id: Id = req.params.id;
  const cuboid = await Cuboid.query().findById(id);
  const volume = cuboid && cuboid?.width * cuboid?.height * cuboid?.depth;

  if (!cuboid) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  return res.status(200).json({ ...cuboid, volume });
};

export const create = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { width, height, depth, bagId } = req.body;
  const cuboidVolume = width * height * depth;
  const bag = await Bag.query().findById(bagId).withGraphFetched('cuboids');

  if (!bag) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  const cubeidVolumeTotal = bag?.cuboids
    ? bag?.cuboids
        ?.map((cuboid) => cuboid.width * cuboid.height * cuboid.depth)
        .reduce((accumulator, volume) => accumulator + volume, 0)
    : 0;

  const insufficientCapacity = cuboidVolume + cubeidVolumeTotal >= bag?.volume;

  if (insufficientCapacity) {
    return res
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .json({ message: 'Insufficient capacity in bag' });
  }

  const cuboid = await Cuboid.query().insert({
    width,
    height,
    depth,
    bagId,
  });

  return res.status(HttpStatus.CREATED).json(cuboid);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const id: Id = req.params.id;
  const { width, height, depth, volume, bagId } = req.body;
  const cuboidVolume = width * height * depth;

  const bag = await Bag.query().findById(bagId).withGraphFetched('cuboids');

  if (!bag) {
    return res.sendStatus(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  const volumes = bag?.cuboids?.map((cuboid) => {
    const volume =
      cuboid.id === Number(id)
        ? cuboidVolume
        : cuboid.width * cuboid.height * cuboid.depth;

    return volume;
  });

  const volumesAmount = volumes?.reduce(
    (accumulator, volume) => accumulator + volume,
    0
  );
  const hasSufficientCapacity = volumesAmount && volumesAmount <= bag?.volume;

  if (!hasSufficientCapacity) {
    return res
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .json({ message: 'Insufficient capacity in bag' });
  }

  const cuboid = await Cuboid.query()

    .updateAndFetchById(id, { width, height, depth, volume })
    .withGraphFetched('bag');

  return res.status(200).json(cuboid);
};

export const del = async (req: Request, res: Response): Promise<Response> => {
  const id: Id = req.params.id;
  const numberOfDeletedRows = await Cuboid.query().deleteById(id);
  const deleted = numberOfDeletedRows > 0;

  if (!deleted) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  return res.sendStatus(HttpStatus.OK);
};
