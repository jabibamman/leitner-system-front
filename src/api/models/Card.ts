import { Category } from "./Category";

export type CardId = string;
export interface CardUserData {
  question: string;
  answer: string;
  tag?: string; 
}


export interface Card extends CardUserData {
  id: CardId;
  category: Category;
}