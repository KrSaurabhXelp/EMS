import * as React from "react";
import { Controller, type ControllerRenderProps, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { cn } from "../../lib/utils";

type FormProps<TFormValues extends FieldValues> = {
  form: UseFormReturn<TFormValues>;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

function Form<TFormValues extends FieldValues>({ form, children, className, ...props }: FormProps<TFormValues>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  );
}

type FormFieldProps<TFormValues extends FieldValues, TName extends FieldPath<TFormValues>> = {
  control: UseFormReturn<TFormValues>["control"];
  name: TName;
  render: (props: { field: ControllerRenderProps<TFormValues, TName> }) => React.ReactNode;
};

function FormField<TFormValues extends FieldValues, TName extends FieldPath<TFormValues>>({ control, name, render }: FormFieldProps<TFormValues, TName>) {
  return <Controller control={control} name={name} render={({ field }) => <>{render({ field })}</>} />;
}

function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

function FormControl({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-gray-700 dark:text-gray-100", className)} {...props} />;
}

function FormMessage({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-destructive min-h-[1.25rem]", className)} {...props}>
      {children}
    </p>
  );
}

export { Form, FormControl, FormField, FormItem, FormLabel, FormMessage };
