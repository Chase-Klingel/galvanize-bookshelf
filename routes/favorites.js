'use strict';

const express = require('express');
const boom = require('boom');
const jwt = require('jsonwebtoken');
const { camelizeKeys, decamelizeKeys } = require('humps');
const knex = require('../knex');

// eslint-disable-next-line new-cap
const router = express.Router();

const authorization = (req, res, next) => {
  jwt.verify(req.cookies.token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(boom.create(401, 'Unauthorized'));
    }

    req.token = decoded;

    next();
  });
};

router.get('/favorites', authorization, (req, res, next) => {
  const { userId } = req.token;

  knex('favorites')
    .innerJoin('books', 'books.id', 'favorites.book_id')
    .where('favorites.user_id', userId)
    .orderBy('books.title', 'ASC')
    .then((rows) => {
      const favorites = camelizeKeys(rows);

      res.send(favorites);
    })
    .catch((err) => {
      next(err);
    });
});

router.get('/favorites/check', authorization, (req, res, next) => {
  const { bookId } = req.query;

  if (isNaN(req.query.bookId)) {
    throw next(boom.create(400, 'Book ID must be an integer'));
  }

  if (bookId > 1) {
    res.send(false);
  } else {
    res.send(true);
  }
});

router.post('/favorites', authorization, (req, res, next) => {
  const { bookId } = req.body;
  const { userId } = req.token;

  if (isNaN(bookId)) {
    throw next(boom.create(400, 'Book ID must be an integer'));
  }

  const insertBook = { bookId, userId };

  return knex('favorites')
    .insert(decamelizeKeys(insertBook), '*')
    .then((rows) => {
      if (!rows) {
        throw next(boom.create(404, 'Book not found'));
      }

      const book = camelizeKeys(rows[0]);

      res.send(book);
    })
    .catch((err) => {
      next(err);
    });
});

router.delete('/favorites', authorization, (req, res, next) => {
  let favorites;

  knex('favorites')
    .select('book_id', 'user_id')
    .then((rows) => {
      if (!rows) {
        throw next(boom.create(404, 'Favorite not found'));
      }

      favorites = camelizeKeys(rows);

      return knex('favorites').del();
    })
    .then(() => {
      res.send(favorites[0]);
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;
