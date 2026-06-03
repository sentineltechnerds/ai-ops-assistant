// Enterprise professional response templates used across the app.

const DEPT_FULL: Record<string, string> = {
  HR: "Human Resources",
  IT: "Information Technology",
  Finance: "Finance",
};

export function deptFullName(dept: string) {
  return DEPT_FULL[dept] ?? dept;
}

export function ticketRef(t: { reference_number?: string | null; id: string }) {
  return t.reference_number || `#${t.id.slice(0, 8)}`;
}

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString();
}

export type TicketLike = {
  id: string;
  reference_number?: string | null;
  department: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  updated_at?: string | null;
};

export function professionalResponse(t: TicketLike): { title: string; body: string } {
  const ref = ticketRef(t);
  const dept = deptFullName(t.department);
  switch (t.status) {
    case "new":
      return {
        title: `Ticket Received — ${ref}`,
        body:
`Thank you for contacting the Support Centre.

This is an automated confirmation that your request has been successfully received and logged.

Reference Number: ${ref}
Department: ${dept}
Status: Open
Date Logged: ${fmt(t.created_at)}

Our team will review your request and provide updates as progress is made. Please retain your reference number for any future communication regarding this matter.

Thank you for your patience and cooperation.

Support Centre`,
      };
    case "in_progress":
      return {
        title: `Status Update: In Progress — ${ref}`,
        body:
`Thank you for your continued patience.

Your request is currently being reviewed by the assigned department.

Reference Number: ${ref}
Department: ${dept}
Status: In Progress
Last Updated: ${fmt(t.updated_at || t.created_at)}

Our team is actively working on your request and will provide further updates as progress is made.

Support Centre`,
      };
    case "awaiting_review":
      return {
        title: `Status Update: Awaiting Review — ${ref}`,
        body:
`Your request has been processed and is currently awaiting final review.

Reference Number: ${ref}
Department: ${dept}
Status: Awaiting Review
Last Updated: ${fmt(t.updated_at || t.created_at)}

Further updates will be provided once the review process has been completed.

Support Centre`,
      };
    case "escalated":
      return {
        title: `Status Update: Escalated — ${ref}`,
        body:
`Your request has been escalated for additional attention.

Reference Number: ${ref}
Department: ${dept}
Status: Escalated
Last Updated: ${fmt(t.updated_at || t.created_at)}

The matter has been assigned for further investigation and prioritised accordingly.

We appreciate your patience while this request is being addressed.

Support Centre`,
      };
    case "resolved":
      return {
        title: `Ticket Resolved — ${ref}`,
        body:
`Your request has been successfully resolved.

Reference Number: ${ref}
Department: ${dept}
Status: Resolved
Resolved Date: ${fmt(t.resolved_at || t.updated_at)}

Should you experience any further issues related to this request, please submit a new ticket and reference the number provided above.

Thank you for working with us throughout the resolution process.

Support Centre`,
      };
    default:
      return { title: `Ticket Update — ${ref}`, body: `Reference Number: ${ref}\nDepartment: ${dept}\nStatus: ${t.status}` };
  }
}
