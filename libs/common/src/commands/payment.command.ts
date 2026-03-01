export class PaymentCommand
{
  constructor(partial: Partial<PaymentCommand>)
  {
    Object.assign(this, partial);
  }
  requestId: string;
  sessionId: string;
}

export class CreatePaymentCheckoutCommand extends PaymentCommand
{
    constructor(partial: Partial<CreatePaymentCheckoutCommand>)
    {
        super(partial);
        Object.assign(this, partial);
    }
    price: number;
    userId: string;
}

export class CreatePaymentCheckoutResponse extends PaymentCommand
{
    constructor(partial: Partial<CreatePaymentCheckoutResponse>)
    {
        super(partial);
        Object.assign(this, partial);
    }
    checkout_url?: string;
    payment_intent_id?: string;
    failed_reason?: string;
}