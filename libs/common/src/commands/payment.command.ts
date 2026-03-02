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
    failed_reason?: string;
}

export class RefundReservationCommand extends PaymentCommand
{
    constructor(partial: Partial<RefundReservationCommand>)
    {
        super(partial);
        Object.assign(this, partial);
    }
    userId: string;
}

export class RefundReservationResponse extends PaymentCommand
{
    constructor(partial: Partial<RefundReservationResponse>)
    {
        super(partial);
        Object.assign(this, partial);
    }
    success: boolean;
    failure_reason?: string;
}