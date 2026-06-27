// Custom Supabase Client using raw HTTP fetches
// Bypasses the need for @supabase/supabase-js library

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pbpuxjbojeootjnzzphl.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const getHeaders = () => {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Perform a raw fetch request to the Supabase PostgREST endpoint.
 */
async function postgrestRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: any,
  preferHeader?: string
) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers: any = getHeaders();
  if (preferHeader) {
    headers['Prefer'] = preferHeader;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      const errText = await res.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errText);
      } catch {
        errorObj = { message: errText };
      }
      throw new Error(errorObj.message || `PostgREST error: ${res.status} ${res.statusText}`);
    }

    if (method === 'DELETE') {
      return { success: true };
    }

    // PostgREST returns empty body for some requests unless Prefer: return=representation is set
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (error: any) {
    console.error(`PostgREST [${method}] ${path} failed:`, error.message);
    throw error;
  }
}

export const customSupabaseApi = {
  /**
   * Fetch rows from a table.
   * Example: select('transactions', 'select=*&order=date.desc')
   */
  async select<T>(table: string, queryParams: string = 'select=*'): Promise<T[]> {
    return postgrestRequest(`${table}?${queryParams}`, 'GET');
  },

  /**
   * Insert a row or rows into a table.
   */
  async insert<T>(table: string, data: any): Promise<T> {
    const res = await postgrestRequest(table, 'POST', data, 'return=representation');
    return Array.isArray(res) ? res[0] : res;
  },

  /**
   * Update rows matching an id.
   */
  async update<T>(table: string, id: string, data: any, idColumn: string = 'id'): Promise<T> {
    const res = await postgrestRequest(`${table}?${idColumn}=eq.${id}`, 'PATCH', data, 'return=representation');
    return Array.isArray(res) ? res[0] : res;
  },

  /**
   * Delete rows matching an id.
   */
  async delete(table: string, id: string, idColumn: string = 'id'): Promise<boolean> {
    await postgrestRequest(`${table}?${idColumn}=eq.${id}`, 'DELETE');
    return true;
  },
};
