import { DefaultProvider } from "./defaultProvider";
import { ZohoProvider } from "./zohoProvider";

export function providerFactory(name: string): DefaultProvider {
    switch (name) {
    case 'Zoho (free)':
        return new ZohoProvider();
    }

    return new DefaultProvider();
}