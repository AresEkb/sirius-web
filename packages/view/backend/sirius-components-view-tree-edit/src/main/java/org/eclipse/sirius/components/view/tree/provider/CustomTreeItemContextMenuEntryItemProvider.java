/*******************************************************************************
 * Copyright (c) 2025 Obeo.
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *     Obeo - initial API and implementation
 *******************************************************************************/
package org.eclipse.sirius.components.view.tree.provider;

import java.util.Collection;
import java.util.List;

import org.eclipse.emf.common.notify.AdapterFactory;
import org.eclipse.emf.common.notify.Notification;
import org.eclipse.emf.edit.provider.ComposeableAdapterFactory;
import org.eclipse.emf.edit.provider.IItemPropertyDescriptor;
import org.eclipse.emf.edit.provider.ItemPropertyDescriptor;
import org.eclipse.emf.edit.provider.ViewerNotification;
import org.eclipse.sirius.components.view.tree.CustomTreeItemContextMenuEntry;
import org.eclipse.sirius.components.view.tree.TreePackage;

/**
 * This is the item provider adapter for a
 * {@link org.eclipse.sirius.components.view.tree.CustomTreeItemContextMenuEntry} object. <!-- begin-user-doc --> <!--
 * end-user-doc -->
 *
 * @generated
 */
public class CustomTreeItemContextMenuEntryItemProvider extends TreeItemContextMenuEntryItemProvider {
    /**
     * This constructs an instance from a factory and a notifier. <!-- begin-user-doc --> <!-- end-user-doc -->
     *
     * @generated
     */
    public CustomTreeItemContextMenuEntryItemProvider(AdapterFactory adapterFactory) {
        super(adapterFactory);
    }

    /**
     * This returns the property descriptors for the adapted class. <!-- begin-user-doc --> <!-- end-user-doc -->
     *
     * @generated
     */
    @Override
    public List<IItemPropertyDescriptor> getPropertyDescriptors(Object object) {
        if (this.itemPropertyDescriptors == null) {
            super.getPropertyDescriptors(object);

            this.addContributionIdPropertyDescriptor(object);
            this.addWithImpactAnalysisPropertyDescriptor(object);
        }
        return this.itemPropertyDescriptors;
    }

    /**
     * This adds a property descriptor for the Contribution Id feature. <!-- begin-user-doc --> <!-- end-user-doc -->
     *
     * @generated
     */
    protected void addContributionIdPropertyDescriptor(Object object) {
        this.itemPropertyDescriptors.add(this.createItemPropertyDescriptor(((ComposeableAdapterFactory) this.adapterFactory).getRootAdapterFactory(), this.getResourceLocator(),
                this.getString("_UI_CustomTreeItemContextMenuEntry_contributionId_feature"),
                this.getString("_UI_PropertyDescriptor_description", "_UI_CustomTreeItemContextMenuEntry_contributionId_feature", "_UI_CustomTreeItemContextMenuEntry_type"),
                TreePackage.Literals.CUSTOM_TREE_ITEM_CONTEXT_MENU_ENTRY__CONTRIBUTION_ID, true, false, false, ItemPropertyDescriptor.GENERIC_VALUE_IMAGE, null, null));
    }

    /**
     * This adds a property descriptor for the With Impact Analysis feature. <!-- begin-user-doc --> <!-- end-user-doc
     * -->
     *
     * @generated
     */
    protected void addWithImpactAnalysisPropertyDescriptor(Object object) {
        this.itemPropertyDescriptors.add(this.createItemPropertyDescriptor(((ComposeableAdapterFactory) this.adapterFactory).getRootAdapterFactory(), this.getResourceLocator(),
                this.getString("_UI_CustomTreeItemContextMenuEntry_withImpactAnalysis_feature"),
                this.getString("_UI_PropertyDescriptor_description", "_UI_CustomTreeItemContextMenuEntry_withImpactAnalysis_feature", "_UI_CustomTreeItemContextMenuEntry_type"),
                TreePackage.Literals.CUSTOM_TREE_ITEM_CONTEXT_MENU_ENTRY__WITH_IMPACT_ANALYSIS, true, false, false, ItemPropertyDescriptor.BOOLEAN_VALUE_IMAGE, null, null));
    }

    /**
     * This returns CustomTreeItemContextMenuEntry.gif. <!-- begin-user-doc --> <!-- end-user-doc -->
     *
     * @generated
     */
    @Override
    public Object getImage(Object object) {
        return this.overlayImage(object, this.getResourceLocator().getImage("full/obj16/CustomTreeItemContextMenuEntry"));
    }

    /**
     * <!-- begin-user-doc --> <!-- end-user-doc -->
     *
     * @generated
     */
    @Override
    protected boolean shouldComposeCreationImage() {
        return true;
    }

    /**
     * This returns the label text for the adapted class. <!-- begin-user-doc --> <!-- end-user-doc -->
     *
     * @generated
     */
    @Override
    public String getText(Object object) {
        String label = ((CustomTreeItemContextMenuEntry) object).getName();
        return label == null || label.length() == 0 ? this.getString("_UI_CustomTreeItemContextMenuEntry_type") : this.getString("_UI_CustomTreeItemContextMenuEntry_type") + " " + label;
    }

    /**
     * This handles model notifications by calling {@link #updateChildren} to update any cached children and by creating
     * a viewer notification, which it passes to {@link #fireNotifyChanged}. <!-- begin-user-doc --> <!-- end-user-doc
     * -->
     *
     * @generated
     */
    @Override
    public void notifyChanged(Notification notification) {
        this.updateChildren(notification);

        switch (notification.getFeatureID(CustomTreeItemContextMenuEntry.class)) {
            case TreePackage.CUSTOM_TREE_ITEM_CONTEXT_MENU_ENTRY__CONTRIBUTION_ID:
            case TreePackage.CUSTOM_TREE_ITEM_CONTEXT_MENU_ENTRY__WITH_IMPACT_ANALYSIS:
                this.fireNotifyChanged(new ViewerNotification(notification, notification.getNotifier(), false, true));
                return;
        }
        super.notifyChanged(notification);
    }

    /**
     * This adds {@link org.eclipse.emf.edit.command.CommandParameter}s describing the children that can be created
     * under this object. <!-- begin-user-doc --> <!-- end-user-doc -->
     *
     * @generated
     */
    @Override
    protected void collectNewChildDescriptors(Collection<Object> newChildDescriptors, Object object) {
        super.collectNewChildDescriptors(newChildDescriptors, object);
    }

}
