export class PaymentEvent
{
    constructor(partial: Partial<PaymentEvent>)
    {
        Object.assign(this, partial);
    }
    sessionId: string;
    requestId: string;
}

export class PaymentConfirmedEvent extends PaymentEvent
{
    constructor(partial: Partial<PaymentConfirmedEvent>)
    {
        super(partial);
        Object.assign(this, partial);
    }
    price: number;
}

export class PaymentFailedEvent extends PaymentEvent
{
    constructor(partial: Partial<PaymentFailedEvent>)
    {
        super(partial);
        Object.assign(this, partial);
    }
    failure_reason: string;
}