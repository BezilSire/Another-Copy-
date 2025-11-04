export const INTERESTS_LIST = [
    'Entrepreneurship', 'Marketing', 'Technology', 'Psychology', 'Growth Hacking', 
    'Finance', 'Economics', 'Art & Design', 'Community Building', 'Sustainability', 
    'Education', 'Health & Wellness', 'Agriculture', 'Software Development', 'Policy & Governance'
];

export const SKILLS_LIST = [
    'Project Management', 'Digital Marketing', 'Content Creation', 'Graphic Design', 'Web Development',
    'Mobile Development', 'Data Analysis', 'Financial Modeling', 'Public Speaking', 'Sales & Negotiation',
    'Legal Advisory', 'Business Strategy', 'UI/UX Design', 'Copywriting', 'SEO/SEM', 'Videography',
    'Community Management', 'Farming Techniques', 'Teaching & Mentorship', 'Healthcare Services', 'Mechanical Repair',
    'Electrical Engineering', 'Event Planning', 'Customer Support', 'Supply Chain Management'
];


export const generateAgentCode = (): string => {
  const prefix = 'UGC';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
};

export const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like I, O, 0, 1
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const exportToCsv = (filename: string, data: Record<string, any>[]) => {
  if (!data || data.length === 0) {
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // header row
    ...data.map(row =>
      headers
        .map(fieldName => {
            let value = row[fieldName];
            if (value === null || value === undefined) {
                return '';
            }
            let stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                stringValue = `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  if (seconds < 10) {
    return "just now";
  }
  return Math.floor(seconds) + " seconds ago";
};