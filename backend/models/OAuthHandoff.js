const mongoose = require('mongoose');

/**
 * One-time OAuth session handoff: opaque code in URL → exchanged for tokens via POST.
 * TTL index removes expired documents automatically.
 */
const oauthHandoffSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

oauthHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OAuthHandoff', oauthHandoffSchema);
