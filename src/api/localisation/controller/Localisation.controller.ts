import { Request, Response } from 'express';
import { prisma } from '../../../prisma';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LocalisationDto } from '../dto/Localisation.dto';
import { StatusCodes } from 'http-status-codes';
import express from 'express';
import { Casino } from '@prisma/client';

export const LocalisationController = express.Router()

type CasinoWithDistance = Casino & { distance: number }; //Przyda się potem, wiadomo że na razie nie ma tabelki

//Funkcja do liczenia odległości na podstawie wzoru haversine

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
  
    const R = 6371; // promień Ziemi w km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

// jeszcze nie mamy tabeli casino, jest w schema ale nie mogę zrobić migracji, a nic nie zresetuję bo tylko zepsuje

LocalisationController.post('/', async (req: Request, res: Response) => {
    const dto = plainToInstance(LocalisationDto, req.body);
    const errors = await validate(dto);
  
    if (errors.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ errors });
    }
  
    try {
      const casino = await prisma.casino.create({ data: dto });
      res.status(StatusCodes.CREATED).json(casino);
    } catch (err) {
      console.error(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  });
  
LocalisationController.get('/', async (_req: Request, res: Response) => {
    try {
      const casinos = await prisma.casino.findMany();
      res.json(casinos);
    } catch (err) {
      console.error(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch casinos' });
    }
});
  
LocalisationController.get('/:id', async (req: Request, res: Response) => {
    try {
      const casino = await prisma.casino.findUnique({
        where: { id: req.params.id },
      });
  
      if (!casino) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Casino not found' });
      }
  
      res.json(casino);
    } catch (err) {
      console.error(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
    }
});
  
LocalisationController.put('/:id', async (req: Request, res: Response) => {
    const dto = plainToInstance(LocalisationDto, req.body);
    const errors = await validate(dto);
  
    if (errors.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ errors });
    }
  
    try {
      const casino = await prisma.casino.update({
        where: { id: req.params.id },
        data: dto,
      });
  
      res.json(casino);
    } catch (err) {
      console.error(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Update failed' });
    }
});
  
LocalisationController.delete('/:id', async (req: Request, res: Response) => {
    try {
      await prisma.casino.delete({
        where: { id: req.params.id },
      });
  
      res.status(StatusCodes.NO_CONTENT).send();
    } catch (err) {
      console.error(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Delete failed' });
    }
});
  

//dobra, podajecie promień, wysokosć i długość geograficzną, i zwraca kasyna w danym promieniu od punktu którego wsp podaliście
// np /nearby?lat=52.2297&lon=21.0122&radius=5 zwróci w odległości 5 km od Warszawy
LocalisationController.get('/nearby', async (req: Request, res: Response) => {
    const { lat, lon, radius = '10' } = req.query;
  
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const maxDistance = parseFloat(radius as string);
  
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
  
    try {
      const allCasinos = await prisma.casino.findMany();
  
      const nearby = allCasinos
        .map((casino) => {
          const distance = haversineDistance(
            latitude,
            longitude,
            casino.latitude,
            casino.longitude
          );
          return { ...casino, distance };
        })
        .filter((c: CasinoWithDistance) => c.distance <= maxDistance)
        .sort((a: CasinoWithDistance, b: CasinoWithDistance) => a.distance - b.distance);
  
      res.json({ results: nearby, count: nearby.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
});