CREATE TABLE `attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `flow_id` text NOT NULL,
  `node_id` text,
  `filename` text NOT NULL,
  `original_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size` integer NOT NULL,
  `uploaded_by` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`node_id`) REFERENCES `flow_nodes`(`id`) ON DELETE CASCADE
);
