import { Request, Response } from 'express';
import { prisma } from '../../../prisma';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LocalisationDto } from '../dto/Localisation.dto';
import { StatusCodes } from 'http-status-codes';
import express from 'express';
import { Casino } from '@prisma/client';

/**
 * @swagger
 * tags:
 *   name: Localisation
 *   description: Casino location management
 */

export const LocalisationController = express.Router()

type CasinoWithDistance = Casino & { distance: number }; //Przyda się potem, wiadomo że na razie nie ma tabelki


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


/**
 * @swagger
 * /localisation:
 *   post:
 *     summary: Create a new casino location
 *     tags: [Localisation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - latitude
 *               - longitude
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the casino
 *               latitude:
 *                 type: number
 *                 description: Latitude coordinate
 *               longitude:
 *                 type: number
 *                 description: Longitude coordinate
 *     responses:
 *       201:
 *         description: Casino created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
LocalisationController.post('/', async (req: Request, res: Response) => {
    try {
      const dto = plainToInstance(LocalisationDto, req.body);
      
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        const formattedErrors = errors.map(error => ({
          property: error.property,
          constraints: error.constraints
        }));
        
        res.status(StatusCodes.BAD_REQUEST).json({ 
          message: 'Błędy walidacji',
          errors: formattedErrors 
        });
      } else {
        const casinoData = {
          name: dto.name,
          latitude: dto.latitude,
          longitude: dto.longitude
        };
        
        const casino = await prisma.casino.create({ 
          data: casinoData 
        });
        
        res.status(StatusCodes.CREATED).json({
          message: 'Kasyno zostało pomyślnie utworzone',
          data: casino
        });
      }
    } catch (err: any) {
      console.error('Error creating casino:', err);
      
      if (err.code) {
        res.status(StatusCodes.BAD_REQUEST).json({ 
          message: 'Błąd bazy danych', 
          error: err.message 
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          message: 'Wewnętrzny błąd serwera' 
        });
      }
    }
    return;
  });
  
/**
 * @swagger
 * /localisation:
 *   get:
 *     summary: Get all casino locations
 *     tags: [Localisation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all casinos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *       500:
 *         description: Server error
 */
LocalisationController.get('/', async (_req: Request, res: Response) => {
    try {
      const casinos = await prisma.casino.findMany();
      res.json({
        message: 'Lista kasyn pobrana pomyślnie',
        data: casinos
      });
    } catch (err: any) {
      console.error('Error fetching casinos:', err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Nie udało się pobrać listy kasyn' });
    }
    return;
});

//dobra, podajecie promień, wysokość i długość geograficzną, i zwraca kasyna w danym promieniu od punktu którego wsp podaliście
// np /nearby?lat=52.2297&lon=21.0122&radius=5 zwróci w odległości 5 km od Warszawy
// Endpoint musi być przed /:id, inaczej Express zinterpretuje '/nearby' jako parametr id
/**
 * @swagger
 * /localisation/nearby:
 *   get:
 *     summary: Find casinos near a specified location
 *     tags: [Localisation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: List of nearby casinos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                       distance:
 *                         type: number
 *                         description: Distance in kilometers
 *       400:
 *         description: Invalid coordinates
 *       500:
 *         description: Server error
 */
LocalisationController.get('/nearby', async (req: Request, res: Response) => {
    const { lat, lon, radius = '10' } = req.query;
  
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const maxDistance = parseFloat(radius as string);
  
    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Nieprawidłowe współrzędne geograficzne',
        error: 'Parametry lat i lon muszą być liczbami' 
      });
    } else {
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
  
        res.json({ 
          message: `Znaleziono ${nearby.length} kasyn w promieniu ${maxDistance} km`,
          count: nearby.length,
          data: nearby
        });
      } catch (err: any) {
        console.error('Error finding nearby casinos:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          message: 'Błąd serwera podczas wyszukiwania pobliskich kasyn' 
        });
      }
    }
    return;
});
  
/**
 * @swagger
 * /localisation/{id}:
 *   get:
 *     summary: Get a casino by ID
 *     tags: [Localisation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Casino ID
 *     responses:
 *       200:
 *         description: Casino details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *       404:
 *         description: Casino not found
 *       500:
 *         description: Server error
 */
LocalisationController.get('/:id', async (req: Request, res: Response) => {
    try {
      const casino = await prisma.casino.findUnique({
        where: { id: req.params.id },
      });
  
      if (!casino) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Nie znaleziono kasyna o podanym ID' });
      } else {
        res.json({
          message: 'Kasyno pobrane pomyślnie',
          data: casino
        });
      }
    } catch (err: any) {
      console.error('Error fetching casino by ID:', err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Wystąpił błąd podczas pobierania kasyna' });
    }
    return;
});
  
/**
 * @swagger
 * /localisation/{id}:
 *   put:
 *     summary: Update a casino
 *     tags: [Localisation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Casino ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - latitude
 *               - longitude
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the casino
 *               latitude:
 *                 type: number
 *                 description: Latitude coordinate
 *               longitude:
 *                 type: number
 *                 description: Longitude coordinate
 *     responses:
 *       200:
 *         description: Casino updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Casino not found
 *       500:
 *         description: Server error
 */
LocalisationController.put('/:id', async (req: Request, res: Response) => {
    try {
      const dto = plainToInstance(LocalisationDto, req.body);
      
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        const formattedErrors = errors.map(error => ({
          property: error.property,
          constraints: error.constraints
        }));
        
        res.status(StatusCodes.BAD_REQUEST).json({ 
          message: 'Błędy walidacji',
          errors: formattedErrors 
        });
      } else {
        const existingCasino = await prisma.casino.findUnique({
          where: { id: req.params.id }
        });
        
        if (!existingCasino) {
          res.status(StatusCodes.NOT_FOUND).json({ message: 'Nie znaleziono kasyna o podanym ID' });
          return;
        }
        
        const casinoData = {
          name: dto.name,
          latitude: dto.latitude,
          longitude: dto.longitude
        };
        
        const casino = await prisma.casino.update({
          where: { id: req.params.id },
          data: casinoData,
        });
        
        res.json({
          message: 'Kasyno zostało pomyślnie zaktualizowane',
          data: casino
        });
      }
    } catch (err: any) {
      console.error('Error updating casino:', err);
      
      if (err.code) {
        res.status(StatusCodes.BAD_REQUEST).json({ 
          message: 'Błąd bazy danych', 
          error: err.message 
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          message: 'Aktualizacja nie powiodła się' 
        });
      }
    }
    return;
});
  
/**
 * @swagger
 * /localisation/{id}:
 *   delete:
 *     summary: Delete a casino
 *     tags: [Localisation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Casino ID
 *     responses:
 *       200:
 *         description: Casino deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Casino not found
 *       500:
 *         description: Server error
 */
LocalisationController.delete('/:id', async (req: Request, res: Response) => {
    try {
      const existingCasino = await prisma.casino.findUnique({
        where: { id: req.params.id }
      });
      
      if (!existingCasino) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Nie znaleziono kasyna o podanym ID' });
        return;
      }
      
      await prisma.casino.delete({
        where: { id: req.params.id },
      });
      
      res.status(StatusCodes.OK).json({
        message: 'Kasyno zostało pomyślnie usunięte'
      });
    } catch (err: any) {
      console.error('Error deleting casino:', err);
      
      if (err.code) {
        res.status(StatusCodes.BAD_REQUEST).json({ 
          message: 'Błąd bazy danych', 
          error: err.message 
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          message: 'Usunięcie nie powiodło się' 
        });
      }
    }
    return;
});
  
