import type { PortfolioNode } from '../types';

export const initialData: PortfolioNode = {
  id: 'root',
  name: 'My Portfolio',
  relativePercent: 100,
  isExpanded: true,
  children: [
    {
      id: 'equities',
      name: 'Equities',
      relativePercent: 50,
      isExpanded: true,
      children: [
        {
          id: 'eu-market',
          name: 'EU Market',
          relativePercent: 20,
          isExpanded: false,
          children: [],
        },
        {
          id: 'sp500',
          name: 'S&P 500',
          relativePercent: 50,
          isExpanded: false,
          children: [],
        },
        {
          id: 'individual-stocks',
          name: 'Individual Stocks',
          relativePercent: 30,
          isExpanded: true,
          children: [
            {
              id: 'value-stocks',
              name: 'Value Stocks',
              relativePercent: 40,
              isExpanded: false,
              children: [],
            },
            {
              id: 'growth-stocks',
              name: 'Growth Stocks',
              relativePercent: 60,
              isExpanded: true,
              children: [
                {
                  id: 'mining',
                  name: 'Mining Sector',
                  relativePercent: 30,
                  isExpanded: false,
                  children: [],
                },
                {
                  id: 'tech',
                  name: 'Tech Sector',
                  relativePercent: 40,
                  isExpanded: false,
                  children: [],
                },
                {
                  id: 'healthcare',
                  name: 'Healthcare',
                  relativePercent: 30,
                  isExpanded: false,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bonds',
      name: 'Bonds',
      relativePercent: 50,
      isExpanded: false,
      children: [],
    },
  ],
};
