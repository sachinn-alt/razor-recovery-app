import type { Transaction } from './types';

export const initialBatchData: Transaction[] = [
  {
    id: "invoice_VT_9023",
    customerName: "Vortex Technologies Ltd",
    email: "accounts@vortextech.in",
    phone: "+91 22 4920 1200",
    amount: 125000.00,
    productName: "Enterprise SaaS Licensing",
    timestamp: "2026-08-22T08:05:00Z",
    failureType: "invoice_overdue_net15",
    initialErrorCode: "INVOICE_OVERDUE_NET15",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "Email",
    notes: "Invoice Vt-9023 Net 15 credit agreement past due date."
  },
  {
    id: "invoice_AL_4560",
    customerName: "Aurobindo Logistics Corp",
    email: "billing@aurobindologistics.com",
    phone: "+91 40 2314 5543",
    amount: 85000.00,
    productName: "Bulk Supply Chain Optimization",
    timestamp: "2026-08-22T08:08:00Z",
    failureType: "invoice_overdue_net30",
    initialErrorCode: "INVOICE_OVERDUE_NET30",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "Email",
    notes: "Invoice Al-4560 Net 30 credit agreement past due date."
  },
  {
    id: "pay_failed_001",
    customerName: "Aarav Sharma",
    email: "aarav.sharma@outlook.com",
    phone: "+91 98765 43210",
    amount: 1499.00,
    productName: "SaaS Starter Plan Monthly",
    timestamp: "2026-08-22T08:12:00Z",
    failureType: "card_declined_insufficient_funds",
    initialErrorCode: "PAYMENT_DECLINED_INSUFFICIENT_FUNDS",
    status: "Recovering",
    attempts: 1,
    maxAttempts: 3,
    recoveryChannel: "WhatsApp",
    notes: "Customer promised to clear dues on 26th Aug. Reminders paused.",
    ptpDate: "2026-08-26"
  },
  {
    id: "pay_failed_002",
    customerName: "Priya Patel",
    email: "priya.patel@gmail.com",
    phone: "+91 91234 56789",
    amount: 4999.00,
    productName: "UX/UI Design Course Bootcamp",
    timestamp: "2026-08-22T08:15:30Z",
    failureType: "network_timeout",
    initialErrorCode: "GATEWAY_ERROR_NETWORK_TIMEOUT",
    status: "Failed",
    attempts: 0,
    maxAttempts: 2,
    recoveryChannel: "SMS",
    notes: "Network drop between gateway and issuer bank."
  },
  {
    id: "pay_failed_003",
    customerName: "Rahul Nair",
    email: "rahul.nair@nairconsulting.in",
    phone: "+91 88990 11223",
    amount: 12500.00,
    productName: "B2B Custom Packaging Bulk",
    timestamp: "2026-08-22T08:18:45Z",
    failureType: "checkout_abandoned",
    initialErrorCode: "CUSTOMER_ABANDONED_CHECKOUT",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "Email",
    notes: "Cart abandoned at OTP validation step."
  },
  {
    id: "pay_failed_004",
    customerName: "Ananya Iyer",
    email: "ananya.iyer@gmail.com",
    phone: "+91 77665 54433",
    amount: 999.00,
    productName: "Fitness Coach Premium App",
    timestamp: "2026-08-22T08:22:10Z",
    failureType: "mandate_registration_failed",
    initialErrorCode: "UPI_MANDATE_REGISTRATION_FAILED",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "WhatsApp",
    notes: "Autopay mandate registration timed out on UPI app."
  },
  {
    id: "pay_failed_005",
    customerName: "Vikram Malhotra",
    email: "vikram.m@malhotratech.com",
    phone: "+91 99887 76655",
    amount: 25000.00,
    productName: "Enterprise Cloud Hosting",
    timestamp: "2026-08-22T08:25:00Z",
    failureType: "card_declined_insufficient_funds",
    initialErrorCode: "PAYMENT_DECLINED_LIMIT_EXCEEDED",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "Email",
    notes: "Transaction amount exceeds daily limit set on card."
  },
  {
    id: "pay_failed_006",
    customerName: "Sanya Gupta",
    email: "sanya.gupta@yahoo.com",
    phone: "+91 93456 78901",
    amount: 2199.00,
    productName: "D2C Leather Handbag",
    timestamp: "2026-08-22T08:30:15Z",
    failureType: "authentication_failed",
    initialErrorCode: "AUTHENTICATION_FAILED_INCORRECT_OTP",
    status: "Failed",
    attempts: 0,
    maxAttempts: 2,
    recoveryChannel: "WhatsApp",
    notes: "Customer entered incorrect 3D Secure / OTP code twice."
  },
  {
    id: "pay_failed_007",
    customerName: "Amit Sen",
    email: "amit.sen@rediffmail.com",
    phone: "+91 98989 89898",
    amount: 850.00,
    productName: "Monthly Gourmet Coffee Subscription",
    timestamp: "2026-08-22T08:32:00Z",
    failureType: "mandate_registration_failed",
    initialErrorCode: "CARD_MANDATE_CREATION_FAILED",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "WhatsApp",
    notes: "Bank does not support e-Mandate auto-debit on this card class."
  },
  {
    id: "pay_failed_008",
    customerName: "Meera Reddy",
    email: "meera.reddy@gmail.com",
    phone: "+91 91234 43219",
    amount: 1599.00,
    productName: "Air Purifier Filter Replacement",
    timestamp: "2026-08-22T08:34:50Z",
    failureType: "network_timeout",
    initialErrorCode: "NPCI_UPI_SERVER_DOWN",
    status: "Failed",
    attempts: 0,
    maxAttempts: 2,
    recoveryChannel: "WhatsApp",
    notes: "NPCI UPI central directory failed to resolve VPA."
  },
  {
    id: "pay_failed_009",
    customerName: "Rohan Das",
    email: "rohan.das@live.com",
    phone: "+91 88776 65544",
    amount: 3200.00,
    productName: "Mechanical Keyboard RGB",
    timestamp: "2026-08-22T08:37:12Z",
    failureType: "checkout_abandoned",
    initialErrorCode: "CUSTOMER_ABANDONED_CHECKOUT",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "SMS",
    notes: "Abandoned at payment method selection. User was looking for credit card EMI."
  },
  {
    id: "pay_failed_010",
    customerName: "Divya Krishnan",
    email: "divya.k@gmail.com",
    phone: "+91 76543 21098",
    amount: 7999.00,
    productName: "Digital Marketing Masterclass",
    timestamp: "2026-08-22T08:39:40Z",
    failureType: "card_declined_insufficient_funds",
    initialErrorCode: "PAYMENT_DECLINED_INSUFFICIENT_FUNDS",
    status: "Failed",
    attempts: 0,
    maxAttempts: 3,
    recoveryChannel: "WhatsApp",
    notes: "Low balance on bank account tied to debit card."
  },
  // Generated extra records for the simulator
  ...Array.from({ length: 45 }, (_, i) => {
    const index = i + 11;
    const names = [
      "Karan Johar", "Sneha Rao", "Aditya Verma", "Pooja Hegde", "Rishabh Pant", 
      "Tanvi Joshi", "Nikhil Kamath", "Ishita Dutta", "Manish Malhotra", "Kriti Sanon",
      "Varun Dhawan", "Shraddha Kapoor", "Siddharth Malhotra", "Kiara Advani", "Ranbir Kapoor",
      "Alia Bhatt", "Vicky Kaushal", "Katrina Kaif", "Ayushmann Khurrana", "Bhumi Pednekar",
      "Rajkummar Rao", "Patralekhaa Paul", "Kartik Aaryan", "Sara Ali Khan", "Janhvi Kapoor",
      "Ananya Panday", "Ishaan Cutter", "Pankaj Tripathi", "Manoj Bajpayee", "Nawazuddin Siddiqui",
      "Radhika Apte", "Huma Qureshi", "Taapsee Pannu", "Yami Gautam", "Richa Chadha",
      "Ali Fazal", "Sushant Singh", "Bobby Deol", "Sunny Deol",
      "Abhishek Bachchan", "Aishwarya Rai", "Kareena Kapoor", "Saif Ali Khan", "Karisma Kapoor"
    ];
    const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "startup.in", "freelancer.co.in"];
    const products = [
      { name: "SaaS Premium Subscription", price: 2999.00, type: "mandate_registration_failed" as const, code: "CARD_MANDATE_CREATION_FAILED", chan: "WhatsApp" as const },
      { name: "D2C Running Shoes", price: 3499.00, type: "checkout_abandoned" as const, code: "CUSTOMER_ABANDONED_CHECKOUT", chan: "WhatsApp" as const },
      { name: "EdTech Coding Course", price: 15000.00, type: "card_declined_insufficient_funds" as const, code: "PAYMENT_DECLINED_INSUFFICIENT_FUNDS", chan: "WhatsApp" as const },
      { name: "Fitness Gym Monthly Pass", price: 1200.00, type: "authentication_failed" as const, code: "AUTHENTICATION_FAILED_INCORRECT_OTP", chan: "SMS" as const },
      { name: "B2B Design Services", price: 45000.00, type: "network_timeout" as const, code: "GATEWAY_ERROR_NETWORK_TIMEOUT", chan: "Email" as const }
    ];

    const prod = products[index % products.length];
    const firstName = names[index % names.length].split(" ")[0].toLowerCase();
    const domain = domains[index % domains.length];
    const email = `${firstName}.${index}@${domain}`;
    const phone = `+91 ${98000 + index} ${10000 + index}`;
    
    let notes = "";
    if (prod.type === "card_declined_insufficient_funds") {
      notes = "Insufficient funds. Card declined by the customer's bank.";
    } else if (prod.type === "network_timeout") {
      notes = "The bank server took too long to respond during payment processing.";
    } else if (prod.type === "checkout_abandoned") {
      notes = "Customer left the payment page after opening the checkout window.";
    } else if (prod.type === "authentication_failed") {
      notes = "Incorrect OTP or payment validation code entered by the user.";
    } else {
      notes = "Automatic mandate registration failed during UPI Autopay setup.";
    }

    return {
      id: `pay_failed_${String(index).padStart(3, '0')}`,
      customerName: names[index % names.length],
      email: email,
      phone: phone,
      amount: prod.price,
      productName: prod.name,
      timestamp: new Date(Date.now() - (60000 * (60 - index))).toISOString(),
      failureType: prod.type,
      initialErrorCode: prod.code,
      status: "Failed" as const,
      attempts: 0,
      maxAttempts: 3,
      recoveryChannel: prod.chan,
      notes: notes
    };
  })
];
