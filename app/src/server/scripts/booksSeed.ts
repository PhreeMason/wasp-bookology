import { type Book, Trope } from 'wasp/entities';
import { faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';
import { books } from './booklists.js'

const genreNormalizers = [
  " fiction",
  " realistic",
]

const genreNormalizerExceptions = [
  "science fiction",
  "historical fiction",
  "Literary fiction",
  "women's fiction",
  "realistic fiction",
]

// in a terminal window run `wasp db seed` to seed your dev database with mock user data
export function createBooks() {
  const unSeededBooks = books.map(book => {
    const { title, author, rating, ratingCount, genres } = book
    let hasFiction = false;
    const genresNormalized = genres.map(genre => {
      if (genre.toLowerCase().includes(" fiction") && !genreNormalizerExceptions.includes(genre)) {
        hasFiction = true
        return genre.replace(" fiction", "")
      }
      return genre.toLowerCase()
    })

    if (hasFiction) {
      genresNormalized.push("fiction")
    }
    return {
      title,
      author,
      rating,
      ratingCount,
      genres: genresNormalized,
      createdAt: new Date(),
    }
  })
  // apply genere normalizers

  return unSeededBooks
}

export function createTrope(): Trope {
  const randomTropeText = faker.lorem.words(3);
  return {
    text: randomTropeText,
  } as Trope
}

// create 15 random tropes
// const TROPES: Trope[] = Array(15).fill(0).map(createTrope);

const BOOKS = createBooks();

const GENRES = Array.from(new Set(BOOKS.reduce((acc, book) => [...acc, ...book.genres], [] as string[])));

export async function devSeedBooks(prismaClient: PrismaClient) {
  try {
    // Step 1: Create 15 Tropes
    await prismaClient.tropesOfBook.deleteMany({});
    await prismaClient.genresOfBook.deleteMany({});
    await prismaClient.genre.deleteMany({});
    await prismaClient.book.deleteMany({});
    await prismaClient.genre.createMany({
      data: GENRES.map((genre) => ({ text: genre })),
    }),

    // Step 2: Create Books and Associate Tropes with Books
    await BOOKS.map(async (book) => {
      // check for generes that already exist
      const foundGenres = await prismaClient.genre.findMany({
        where: { text: { in: book.genres } },
      })

      // Create the book
      const createdBook = await prismaClient.book.create({
        data: {
          title: book.title,
          author: book.author,
          rating: book.rating,
          ratingCount: book.ratingCount,
          createdAt: book.createdAt,
        },
      });

      // connect the genres to the book
      await prismaClient.genresOfBook.createMany({
        data: foundGenres.map(({id: genreId}) => ({ 
          bookId: createdBook.id, 
          genreId: genreId,
          assignedBy: 'seed',
          assignedAt: new Date()
        })),
      })

    })
  } catch (error) {
    console.error(error);
  }
}
