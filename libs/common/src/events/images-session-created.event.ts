export class ImageSession 
{
    constructor(partial: Partial<ImageSession>) {
        Object.assign(this, partial);
    }
    sessionId: string;
    photoIds: number[];
    userId: string;
}


export class ImagesSessionCreatedEvent  extends ImageSession{
  constructor(partial: Partial<ImagesSessionCreatedEvent>) {
    super(partial);
  }
  urls:string[]
}

export class ImagesSessionDeletedEvent  extends ImageSession{
  constructor(partial: Partial<ImagesSessionDeletedEvent>) {
    super(partial);
  }
}


export class SessionImagesCreationApprovedEvent extends ImageSession{
  constructor(partial: Partial<SessionImagesCreationApprovedEvent>) {
    super(partial);
  }
  urls:string[]
}

export class SessionImagesCreationRejectedEvent extends ImageSession{
  constructor(partial: Partial<SessionImagesCreationRejectedEvent>) {
    super(partial);
    Object.assign(this, partial);
  }
  
  problem:string
}

export class SessionImagesDeletionApprovedEvent extends ImageSession{
  constructor(partial: Partial<SessionImagesDeletionApprovedEvent>) {
    super(partial);
  }
}

export class SessionImagesDeletionRejectedEvent extends ImageSession{
  constructor(partial: Partial<SessionImagesDeletionRejectedEvent>) {
    super(partial);
    Object.assign(this, partial);
  }
  
  problem:string
}