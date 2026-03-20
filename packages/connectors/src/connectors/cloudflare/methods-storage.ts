import type { ConnectorMethod } from '@keepai/proto';
import { ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== STORAGE & MEDIA =====
export const storageMethods: ConnectorMethod[] = [
  // R2 Buckets
  {
    name: 'r2.buckets.create',
    description: 'Creates a new R2 bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'R2 bucket object',
  },
  {
    name: 'r2.buckets.list',
    description: 'Lists all R2 buckets on your account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of R2 buckets',
  },
  {
    name: 'r2.buckets.delete',
    description: 'Deletes an existing R2 bucket.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Deleted R2 bucket confirmation',
  },
  {
    name: 'r2.buckets.edit',
    description: 'Updates properties of an existing R2 bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Updated R2 bucket object',
  },
  {
    name: 'r2.buckets.get',
    description: 'Gets properties of an existing R2 bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'R2 bucket object',
  },

  // R2 Buckets Lifecycle
  {
    name: 'r2.buckets.lifecycle.update',
    description: 'Set the object lifecycle rules for a bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Lifecycle rules',
  },
  {
    name: 'r2.buckets.lifecycle.get',
    description: 'Get object lifecycle rules for a bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Lifecycle rules',
  },

  // R2 Buckets CORS
  {
    name: 'r2.buckets.cors.update',
    description: 'Set the CORS policy for a bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'CORS policy',
  },
  {
    name: 'r2.buckets.cors.delete',
    description: 'Delete the CORS policy for a bucket.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Deleted CORS policy confirmation',
  },
  {
    name: 'r2.buckets.cors.get',
    description: 'Get the CORS policy for a bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'CORS policy',
  },

  // R2 Buckets Custom Domains
  {
    name: 'r2.buckets.domains.custom.create',
    description: 'Register a new custom domain for an existing R2 bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Custom domain object',
  },
  {
    name: 'r2.buckets.domains.custom.update',
    description: 'Edit the configuration for a custom domain on an existing R2 bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }, { name: 'custom_domain_id', type: 'string', required: true, description: 'Custom domain ID' }],
    returns: 'Updated custom domain object',
  },
  {
    name: 'r2.buckets.domains.custom.list',
    description: 'Gets a list of all custom domains registered with an existing R2 bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }, ...LIST_PARAMS],
    returns: 'List of custom domains',
  },
  {
    name: 'r2.buckets.domains.custom.delete',
    description: 'Remove custom domain registration from an existing R2 bucket.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }, { name: 'custom_domain_id', type: 'string', required: true, description: 'Custom domain ID' }],
    returns: 'Deleted custom domain confirmation',
  },
  {
    name: 'r2.buckets.domains.custom.get',
    description: 'Get the configuration for a custom domain on an existing R2 bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }, { name: 'custom_domain_id', type: 'string', required: true, description: 'Custom domain ID' }],
    returns: 'Custom domain object',
  },

  // R2 Buckets Event Notifications
  {
    name: 'r2.buckets.eventNotifications.update',
    description: 'Create event notification rule.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Event notification rule',
  },
  {
    name: 'r2.buckets.eventNotifications.list',
    description: 'List all event notification rules for a bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'List of event notification rules',
  },
  {
    name: 'r2.buckets.eventNotifications.delete',
    description: 'Delete an event notification rule.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }, { name: 'rule_id', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Deleted event notification rule confirmation',
  },
  {
    name: 'r2.buckets.eventNotifications.get',
    description: 'Get a single event notification rule.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }, { name: 'rule_id', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Event notification rule',
  },

  // R2 Buckets Locks
  {
    name: 'r2.buckets.locks.update',
    description: 'Set lock rules for a bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Lock rules',
  },
  {
    name: 'r2.buckets.locks.get',
    description: 'Get lock rules for a bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Lock rules',
  },

  // R2 Buckets Sippy
  {
    name: 'r2.buckets.sippy.update',
    description: 'Sets configuration for Sippy for an existing R2 bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Sippy config',
  },
  {
    name: 'r2.buckets.sippy.delete',
    description: 'Disables Sippy on this bucket.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Deleted Sippy config confirmation',
  },
  {
    name: 'r2.buckets.sippy.get',
    description: 'Gets configuration for Sippy for an existing R2 bucket.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'bucket_name', type: 'string', required: true, description: 'Bucket name' }],
    returns: 'Sippy config',
  },

  // R2 Temporary Credentials
  {
    name: 'r2.temporaryCredentials.create',
    description: 'Creates temporary access credentials on a bucket.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Temporary credentials object',
  },

  // Stream
  {
    name: 'stream.create',
    description: 'Initiates a video upload using the TUS protocol.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Stream video object',
  },
  {
    name: 'stream.list',
    description: 'Lists up to 1000 videos from a single request.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of stream videos',
  },
  {
    name: 'stream.delete',
    description: 'Deletes a video and its copies from Cloudflare Stream.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'Deleted video confirmation',
  },
  {
    name: 'stream.edit',
    description: 'Edit details for a single video.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'Updated video object',
  },
  {
    name: 'stream.get',
    description: 'Fetches details for a single video.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'Stream video object',
  },

  // Stream Direct Upload
  {
    name: 'stream.directUpload.create',
    description: 'Creates a direct upload that allows video uploads without an API key.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Direct upload URL',
  },

  // Stream Live Inputs
  {
    name: 'stream.liveInputs.create',
    description: 'Creates a live input, and returns credentials that you or your users can use to stream live video.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Live input object',
  },
  {
    name: 'stream.liveInputs.update',
    description: 'Updates a specified live input.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'live_input_identifier', type: 'string', required: true, description: 'Live input ID' }],
    returns: 'Updated live input object',
  },
  {
    name: 'stream.liveInputs.list',
    description: 'Lists the live inputs created for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of live inputs',
  },
  {
    name: 'stream.liveInputs.delete',
    description: 'Prevents a live input from being streamed to.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'live_input_identifier', type: 'string', required: true, description: 'Live input ID' }],
    returns: 'Deleted live input confirmation',
  },
  {
    name: 'stream.liveInputs.get',
    description: 'Retrieves details of an existing live input.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'live_input_identifier', type: 'string', required: true, description: 'Live input ID' }],
    returns: 'Live input object',
  },

  // Stream Keys
  {
    name: 'stream.keys.create',
    description: 'Creates an RSA private key in PEM and JWK formats.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Signing key object',
  },
  {
    name: 'stream.keys.delete',
    description: 'Deletes signing keys and revokes all signed URLs generated with the key.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Key identifier' }],
    returns: 'Deleted signing key confirmation',
  },
  {
    name: 'stream.keys.get',
    description: 'Lists the video ID and creation date and time when a signing key was created.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'List of signing keys',
  },

  // Stream Watermarks
  {
    name: 'stream.watermarks.create',
    description: 'Creates watermark profiles using a single HTTP POST multipart/form-data request.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Watermark profile object',
  },
  {
    name: 'stream.watermarks.list',
    description: 'Lists all watermark profiles for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of watermark profiles',
  },
  {
    name: 'stream.watermarks.delete',
    description: 'Deletes a watermark profile.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Watermark identifier' }],
    returns: 'Deleted watermark confirmation',
  },
  {
    name: 'stream.watermarks.get',
    description: 'Retrieves details for a single watermark profile.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Watermark identifier' }],
    returns: 'Watermark profile object',
  },

  // Stream Webhooks
  {
    name: 'stream.webhooks.update',
    description: 'Creates a webhook notification.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Webhook object',
  },
  {
    name: 'stream.webhooks.delete',
    description: 'Deletes a webhook.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Deleted webhook confirmation',
  },
  {
    name: 'stream.webhooks.get',
    description: 'Retrieves a list of webhooks.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Webhook object',
  },

  // Stream Captions
  {
    name: 'stream.captions.get',
    description: 'Lists the available captions or subtitles for a specific video.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'List of captions',
  },

  // Stream Downloads
  {
    name: 'stream.downloads.create',
    description: 'Creates a download for a video when a video is ready to view.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'Download object',
  },
  {
    name: 'stream.downloads.delete',
    description: 'Delete the downloads for a video.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'Deleted download confirmation',
  },
  {
    name: 'stream.downloads.get',
    description: 'Lists the downloads created for a video.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'Download object',
  },

  // Stream Clip
  {
    name: 'stream.clip.create',
    description: 'Clips a video based on the specified start and end times provided in seconds.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Clipped video object',
  },

  // Stream Token
  {
    name: 'stream.token.create',
    description: 'Creates a signed URL token for a video.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Video identifier' }],
    returns: 'Signed URL token',
  },

  // Images v1
  {
    name: 'images.v1.create',
    description: 'Upload an image with up to 10 Megabytes using a single HTTP POST request.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Image object',
  },
  {
    name: 'images.v1.list',
    description: 'List up to 100 images with one request.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of images',
  },
  {
    name: 'images.v1.delete',
    description: 'Delete an image on Cloudflare Images.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'image_id', type: 'string', required: true, description: 'Image ID' }],
    returns: 'Deleted image confirmation',
  },
  {
    name: 'images.v1.edit',
    description: 'Update image access control.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'image_id', type: 'string', required: true, description: 'Image ID' }],
    returns: 'Updated image object',
  },
  {
    name: 'images.v1.get',
    description: 'Fetch details for a single image.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'image_id', type: 'string', required: true, description: 'Image ID' }],
    returns: 'Image object',
  },

  // Images v2
  {
    name: 'images.v2.list',
    description: 'List up to 10000 images with one request.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of images',
  },
];
