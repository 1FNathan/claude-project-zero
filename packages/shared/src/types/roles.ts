export type Role = 'ba' | 'reviewer';

export type FlowStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export type NodeType = 'process' | 'decision' | 'delay' | 'start' | 'end';

export type ReviewDecision = 'approved' | 'rejected' | 'comment';

export type DocumentFormat = 'pdf' | 'docx' | 'markdown';

export type DocumentType = 'requirements' | 'data_dictionary';
