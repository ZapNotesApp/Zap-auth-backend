const express = require('express');
const jwt = require('jsonwebtoken');
const Note = require('../models/Note');

const router = express.Router();

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Sync notes
router.post('/sync', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.user;
    const clientNotes = req.body;

    // Get all notes for the user from the database
    const serverNotes = await Note.find({ user: userId });

    // Create a map of server notes by their ID
    const serverNotesMap = new Map(serverNotes.map(note => [note._id.toString(), note]));

    // Process client notes
    const updatedNotes = clientNotes.map(clientNote => {
      const serverNote = serverNotesMap.get(clientNote.id);

      if (serverNote) {
        // Update existing note
        serverNote.type = clientNote.type;
        serverNote.content = clientNote.content;
        serverNote.transcription = clientNote.transcription;
        serverNote.isCompleted = clientNote.isCompleted;
        serverNote.updatedAt = new Date();
        return serverNote;
      } else {
        // Create new note
        return new Note({
          _id: clientNote.id,
          user: userId,
          type: clientNote.type,
          content: clientNote.content,
          transcription: clientNote.transcription,
          isCompleted: clientNote.isCompleted,
        });
      }
    });

    // Save all notes
    await Promise.all(updatedNotes.map(note => note.save()));

    // Return updated notes to the client
    res.json(updatedNotes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;